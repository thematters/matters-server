const table = 'article_recommend_setting'
const newColumn = 'in_search'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean(newColumn).defaultTo(true)
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn(newColumn)
  })
}
