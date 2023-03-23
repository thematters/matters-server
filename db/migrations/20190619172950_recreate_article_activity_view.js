const table = 'article_activity_view'

const materialized = 'article_activity_materialized'

export const up = async (knex) => {
  // Drop materialzied view
  await knex.raw(`drop materialized view if exists ${materialized}`)

  // Drop old view
  await knex.raw(`drop view if exists ${table}`)

  // Create new view
  await knex.raw(`
    create view ${table} as
        select
            article.*,
            greatest (
                latest_comment,
                latest_collected_by,
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
            /* last collected by activity */
                select
                    max(created_at) as latest_collected_by,
                    article_id
                from
                    collection
                group by
                    article_id) as a on article.id = a.article_id
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

  // Re-create materialized view
  await knex.raw(`
    create materialized view ${materialized} as
        select *
        from article_activity_view
    `)
}

export const down = async (knex) => {
  // Drop materialized view
  await knex.raw(`drop materialized view if exists ${materialized}`)

  // Drop new created view
  await knex.raw(`drop view if exists ${table}`)

  // Re-create old view
  await knex.raw(`
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

  // Re-create materialized view
  await knex.raw(`
    create materialized view ${materialized} as
        select *
        from article_activity_view
    `)
}
