const table = 'article_count_materialized'

export const up = async (knex) => {
  await knex.raw(/*sql*/ `
  create materialized view ${table} as
        select *
        from article_count_view
  `)
}

export const down = function (knex, Promise) {
  return knex.raw(/*sql*/ `drop materialized view ${table}`)
}
