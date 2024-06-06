const table = 'article_recommend_setting'
const newColumn = 'in_search'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean(newColumn).defaultTo(true)
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn(newColumn)
  })
}
