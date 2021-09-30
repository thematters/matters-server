const topicView = "article_count_view";
const topicMaterialized = "article_count_materialized";

exports.up = async (knex) => {
  // topic
  await knex.raw(/*sql*/ `
  drop view if exists ${topicView} cascade;

  CREATE VIEW ${topicView} AS
  SELECT id,
    title,
    comments_total,
    commenters_7d,
    commenters_1d,
    recent_comment_since,
    (comments_total * 1 / 5 + commenters_7d * 10 + commenters_1d * 50 * (CASE
                                                                            WHEN recent_comment_since <= 8100 THEN sqrt(8100 / recent_comment_since)
                                                                            ELSE 1
                                                                        END)) * (CASE
                                                                                      WHEN commenters_7d > 2 THEN 1
                                                                                      ELSE 0
                                                                                  END) AS score
  FROM
  (SELECT article.id,
      title,
      count(*) AS comments_total,
      count(DISTINCT (CASE
                          WHEN now() - "comment"."created_at" <= '1 week' THEN "comment"."author_id"
                      END)) AS commenters_7d,
      count(DISTINCT (CASE
                          WHEN now() - "comment"."created_at" <= '1 day' THEN "comment"."author_id"
                      END)) AS commenters_1d,
      extract(epoch
              FROM now() - max("comment"."created_at")) AS recent_comment_since
  FROM article
  LEFT JOIN COMMENT ON "article"."id" = "comment"."article_id"
  WHERE "comment"."state" = 'active'
  GROUP BY article.id) AS comment_score;

  create materialized view ${topicMaterialized} as
  select *
  from ${topicView}
  `);
};

exports.down = async (knex) => {};
