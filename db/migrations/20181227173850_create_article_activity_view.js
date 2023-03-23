const table = 'article_activity_view'

export const up = async (knex) =>
  knex.raw(/*sql*/ `
    create view ${table} as
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

export const down = function (knex, Promise) {
  return knex.raw(/*sql*/ `drop view if exists ${table}`)
}
