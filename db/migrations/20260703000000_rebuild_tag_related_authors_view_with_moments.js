const table = 'tag_related_authors_materialized'

// Rebuild the view to fold moment authors into per-tag related-author
// recommendations. Article side keeps its existing read/clap scoring; moment
// side scores authors by non-author comments and likes on their non-spam
// moments. Both sides are thresholded at the 25th percentile per tag, then
// cume_dist-normalized to (0,1] per tag so each side's top author reaches 1.0
// and both interleave fairly when the frontend takes the first few.
export const up = async (knex) => {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${table} CASCADE`)

  await knex.raw(/* sql */ `
    CREATE MATERIALIZED VIEW ${table} AS
    WITH
    -- spam threshold read inline so a daily REFRESH picks up flag changes
    -- without rebuilding the view; NULL when the flag is off / has no value
    spam_threshold AS (
      SELECT value AS threshold
      FROM feature_flag
      WHERE name = 'spam_detection' AND flag = 'on'
      LIMIT 1
    ),
    bypass_spam_users AS (
      SELECT user_id
      FROM user_feature_flag
      WHERE type = 'bypassSpamDetection'
    ),
    moment_entity_type AS (
      SELECT id FROM entity_type WHERE "table" = 'moment' LIMIT 1
    ),

    ---------------------------------------------------------------- article side
    active_articles AS (
      SELECT
        article.author_id,
        article.id AS article_id,
        at.tag_id
      FROM article_tag AS at
      INNER JOIN article ON article.id = at.article_id
      INNER JOIN "user" AS u ON u.id = article.author_id
      WHERE article.state = 'active'
        AND u.state NOT IN ('frozen', 'archived')
        AND u.id NOT IN (SELECT user_id FROM user_restriction)
    ),
    article_author_stats AS (
      SELECT
        a.tag_id,
        a.author_id,
        avg(COALESCE(s.reads, 0)) AS mean_reads,
        avg(COALESCE(s.claps, 0)) AS mean_claps
      FROM active_articles AS a
      LEFT JOIN article_stats_materialized AS s ON s.article_id = a.article_id
      GROUP BY a.tag_id, a.author_id
    ),
    article_author_scores AS (
      SELECT
        tag_id,
        author_id,
        (0.85 * mean_reads + 0.15 * mean_claps) AS score
      FROM article_author_stats
    ),
    article_thresholds AS (
      SELECT
        tag_id,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY score) AS threshold
      FROM article_author_scores
      GROUP BY tag_id
    ),
    article_qualified AS (
      SELECT s.tag_id, s.author_id, s.score
      FROM article_author_scores AS s
      INNER JOIN article_thresholds AS t ON t.tag_id = s.tag_id
      WHERE s.score > t.threshold
    ),
    article_normalized AS (
      SELECT
        tag_id,
        author_id,
        cume_dist() OVER (PARTITION BY tag_id ORDER BY score) AS score
      FROM article_qualified
    ),

    ---------------------------------------------------------------- moment side
    -- non-spam moments with an eligible author, tagged; spam filter mirrors
    -- excludeSpam null-safety: bypassed authors pass; otherwise is_spam=false,
    -- or (is_spam null and (spam_score < threshold or spam_score null)); when
    -- the threshold is NULL nothing is filtered out
    active_moments AS (
      SELECT
        moment.author_id,
        moment.id AS moment_id,
        mt.tag_id
      FROM moment_tag AS mt
      INNER JOIN moment ON moment.id = mt.moment_id
      INNER JOIN "user" AS u ON u.id = moment.author_id
      LEFT JOIN spam_threshold AS st ON true
      WHERE moment.state = 'active'
        AND u.state NOT IN ('frozen', 'archived')
        AND u.id NOT IN (SELECT user_id FROM user_restriction)
        AND (
          st.threshold IS NULL
          OR moment.author_id IN (SELECT user_id FROM bypass_spam_users)
          OR moment.is_spam = false
          OR (
            moment.is_spam IS NULL
            AND (moment.spam_score < st.threshold OR moment.spam_score IS NULL)
          )
        )
    ),
    -- non-author comment count per moment, excluding the moment author and
    -- spam comments (bypass keyed on the comment author, applied separately)
    moment_comment_counts AS (
      SELECT
        am.moment_id,
        count(c.id) AS comment_count
      FROM active_moments AS am
      LEFT JOIN spam_threshold AS st ON true
      LEFT JOIN comment AS c
        ON c.target_id = am.moment_id
        AND c.type = 'moment'
        AND c.target_type_id = (SELECT id FROM moment_entity_type)
        AND c.state = 'active'
        AND c.author_id != am.author_id
        AND (
          st.threshold IS NULL
          OR c.author_id IN (SELECT user_id FROM bypass_spam_users)
          OR c.is_spam = false
          OR (
            c.is_spam IS NULL
            AND (c.spam_score < st.threshold OR c.spam_score IS NULL)
          )
        )
      GROUP BY am.moment_id
    ),
    -- like count per moment; action_moment is unique(target_id,action,user_id)
    -- so count(*) suffices. Exclude restricted/frozen/archived likers
    moment_like_counts AS (
      SELECT
        am.moment_id,
        count(lu.id) AS like_count
      FROM active_moments AS am
      LEFT JOIN action_moment AS l ON l.target_id = am.moment_id AND l.action = 'like'
      INNER JOIN "user" AS lu
        ON lu.id = l.user_id
        AND lu.state NOT IN ('frozen', 'archived')
        AND lu.id NOT IN (SELECT user_id FROM user_restriction)
      GROUP BY am.moment_id
    ),
    moment_author_stats AS (
      SELECT
        am.tag_id,
        am.author_id,
        avg(COALESCE(mc.comment_count, 0)) AS mean_comments,
        avg(COALESCE(ml.like_count, 0)) AS mean_likes
      FROM active_moments AS am
      LEFT JOIN moment_comment_counts AS mc ON mc.moment_id = am.moment_id
      LEFT JOIN moment_like_counts AS ml ON ml.moment_id = am.moment_id
      GROUP BY am.tag_id, am.author_id
    ),
    moment_author_scores AS (
      SELECT
        tag_id,
        author_id,
        (0.6 * mean_comments + 0.4 * mean_likes) AS score
      FROM moment_author_stats
    ),
    moment_thresholds AS (
      SELECT
        tag_id,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY score) AS threshold
      FROM moment_author_scores
      GROUP BY tag_id
    ),
    moment_qualified AS (
      SELECT s.tag_id, s.author_id, s.score
      FROM moment_author_scores AS s
      INNER JOIN moment_thresholds AS t ON t.tag_id = s.tag_id
      WHERE s.score > t.threshold
    ),
    moment_normalized AS (
      SELECT
        tag_id,
        author_id,
        cume_dist() OVER (PARTITION BY tag_id ORDER BY score) AS score
      FROM moment_qualified
    ),

    ------------------------------------------------------------------ combined
    combined AS (
      SELECT tag_id, author_id, score FROM article_normalized
      UNION ALL
      SELECT tag_id, author_id, score FROM moment_normalized
    )
    -- same author qualifying on both sides keeps the higher normalized score;
    -- DISTINCT ON requires the leftmost ORDER BY columns to match its key
    SELECT DISTINCT ON (tag_id, author_id)
      tag_id,
      author_id,
      score
    FROM combined
    ORDER BY tag_id, author_id, score DESC
  `)

  await knex.raw(`
    CREATE UNIQUE INDEX ${table}_tag_author ON ${table} (tag_id, author_id)
  `)

  await knex.raw(`
    CREATE INDEX ${table}_tag_id ON ${table} (tag_id)
  `)
}

export const down = async (knex) => {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${table} CASCADE`)
}
