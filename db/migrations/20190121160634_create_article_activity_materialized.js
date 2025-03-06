const table = 'article_activity_materialized'

exports.up = async (knex) => {
  await knex.raw(/* sql*/ `
  create materialized view ${table} as
      select *
      from article_activity_view
  `)
}

exports.down = function (knex, Promise) {
  return knex.raw(/* sql*/ `drop materialized view ${table}`)
}
