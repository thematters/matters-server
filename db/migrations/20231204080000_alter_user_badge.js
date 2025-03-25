const table = 'user_badge'
const newColumn = 'enabled'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean(newColumn).defaultTo(true)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
