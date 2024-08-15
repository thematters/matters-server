const table = 'article_version'
const newColumn = 'indent_first_line'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean(newColumn).notNullable().defaultTo(false)
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn(newColumn)
  })
}
