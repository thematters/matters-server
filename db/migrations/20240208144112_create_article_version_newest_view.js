const table = 'article_version_newest'

exports.up = async (knex) =>
  knex.raw(/*sql*/ `
    create view ${table} as
      SELECT a.*
      FROM article_version a
      LEFT OUTER JOIN article_version b
          ON a.article_id= b.article_id AND a.id < b.id
      WHERE b.id IS NULL;
  `)

exports.down = function (knex) {
  return knex.raw(/*sql*/ `drop view ${table}`)
}
