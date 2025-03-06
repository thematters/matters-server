const table = 'article_version'
const newColumn = 'indent_first_line'
const view = 'article_version_newest'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean(newColumn).notNullable().defaultTo(false)
  })
  await knex.raw(/* sql*/ `
    CREATE OR REPLACE VIEW ${view} AS
      SELECT a.*
      FROM article_version a
      LEFT OUTER JOIN article_version b
          ON a.article_id= b.article_id AND a.id < b.id
      WHERE b.id IS NULL;
  `)
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn(newColumn)
  })
}
