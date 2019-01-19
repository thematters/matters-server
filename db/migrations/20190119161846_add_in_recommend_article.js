const table = 'article'
const articleActivityView = 'article_activity_view'
const articleCountView = 'article_count_view'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.boolean('in_hottest').defaultTo(true)
    t.boolean('in_newest').defaultTo(true)
  })

  // rebuild `article_activity_view`
  await knex.raw(/*sql*/ `drop view ${articleActivityView}`)
  await knex.raw(/*sql*/ `
    create view ${articleActivityView} as
        select
            article.*,
            greatest (
                latest_comment,
                latest_downstream,
                latest_appreciation) as latest_activity
        from
            article
            left join (
            /* last comment activity */
                select
                    max(created_at) as latest_comment,
                    article_id
                from
                    comment
                group by
                    article_id) as c on article.id = c.article_id
            left join (
            /* last downstream activity */
                select
                    max(created_at) as latest_downstream,
                    upstream_id
                from
                    article
                group by
                    upstream_id) as a on article.id = a.upstream_id
            left join (
            /* last appreciation activity */
                select
                    max(created_at) as latest_appreciation,
                    reference_id
                from
                    transaction
                where purpose = 'appreciate'
                group by
                    reference_id) as ts on article.id = ts.reference_id
  `)

  // rebuild `article_count_view`
  await knex.raw(/*sql*/ `drop view ${articleCountView}`)
  await knex.raw(/*sql*/ `
    create view ${articleCountView} as
        select
            article.*,
            comment_count,
            recent_comment_count
            downstream_count,
            (coalesce(comment_count, 0) * coalesce(recent_comment_count, 0) + coalesce(downstream_count, 0) * 10) * coalesce(boost, 1) as topic_score
        from
            article
            left join
            /* total comment count */
            (
                select
                    count(id) as comment_count,
                    article_id
                from
                    comment
                group by
                    article_id) as c1 on article.id = c1.article_id
            left join
            /* past 72 hours comment count */
            (
                select
                    count(id) as recent_comment_count,
                    article_id
                from
                    comment
                where
                    created_at >= now() -  interval '72 hours'
                group by
                    article_id) as c2 on article.id = c2.article_id
            left join
            /* past 72 hours downstream count */
            (
                select
                    count(id) as downstream_count,
                    upstream_id
                from
                    article
                where
                    created_at >= now() - interval '72 hours'
                group by
                    upstream_id) as a on article.id = a.upstream_id
            left join
            /* boost */
            (
                select
                    boost,
                    article_id
                from
                    article_boost) as b on article.id = b.article_id
  `)
}

exports.down = async knex => {
  // drop latest version of views
  await knex.raw(/*sql*/ `drop view ${articleCountView}`)
  await knex.raw(/*sql*/ `drop view ${articleActivityView}`)
  await knex.schema.table(table, function(t) {
    t.dropColumn('in_hottest')
    t.dropColumn('in_newest')
  })
  /**
   * revert views to
   *  `20181227173850_create_article_activity_view`
   * and
   *  `20181228121829_create_article_count_view`
   * , there are no `remark` field in the article table at the time
   */
  await knex.raw(/*sql*/ `
    create view ${articleActivityView} as
        select
            article.id,
            article.uuid,
            article.author_id,
            article.upstream_id,
            article.title,
            article.slug,
            article.cover,
            article.summary,
            article.word_count,
            article.data_hash,
            article.media_hash,
            article.content,
            article.state,
            article.public,
            article.live,
            article.created_at,
            article.updated_at,
            greatest (
                latest_comment,
                latest_downstream,
                latest_appreciation) as latest_activity
        from
            article
            left join (
            /* last comment activity */
                select
                    max(created_at) as latest_comment,
                    article_id
                from
                    comment
                group by
                    article_id) as c on article.id = c.article_id
            left join (
            /* last downstream activity */
                select
                    max(created_at) as latest_downstream,
                    upstream_id
                from
                    article
                group by
                    upstream_id) as a on article.id = a.upstream_id
            left join (
            /* last appreciation activity */
                select
                    max(created_at) as latest_appreciation,
                    reference_id
                from
                    transaction
                where purpose = 'appreciate'
                group by
                    reference_id) as ts on article.id = ts.reference_id
  `)
  await knex.raw(/*sql*/ `
    create view ${articleCountView} as
        select
            article.id,
            article.uuid,
            article.author_id,
            article.upstream_id,
            article.title,
            article.slug,
            article.cover,
            article.summary,
            article.word_count,
            article.data_hash,
            article.media_hash,
            article.content,
            article.state,
            article.public,
            article.live,
            article.created_at,
            article.updated_at,
            comment_count,
            recent_comment_count
            downstream_count,
            (coalesce(comment_count, 0) * coalesce(recent_comment_count, 0) + coalesce(downstream_count, 0) * 10) * coalesce(boost, 1) as topic_score
        from
            article
            left join
            /* total comment count */
            (
                select
                    count(id) as comment_count,
                    article_id
                from
                    comment
                group by
                    article_id) as c1 on article.id = c1.article_id
            left join
            /* past 72 hours comment count */
            (
                select
                    count(id) as recent_comment_count,
                    article_id
                from
                    comment
                where
                    created_at >= now() -  interval '72 hours'
                group by
                    article_id) as c2 on article.id = c2.article_id
            left join
            /* past 72 hours downstream count */
            (
                select
                    count(id) as downstream_count,
                    upstream_id
                from
                    article
                where
                    created_at >= now() - interval '72 hours'
                group by
                    upstream_id) as a on article.id = a.upstream_id
            left join
            /* boost */
            (
                select
                    boost,
                    article_id
                from
                    article_boost) as b on article.id = b.article_id
  `)
}
