const table = 'article_count_view'

export const up = async (knex) =>
  knex.raw(/*sql*/ `
    create view ${table} as
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

export const down = function (knex, Promise) {
  return knex.raw(/*sql*/ `drop view ${table}`)
}
