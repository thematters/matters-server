const table = 'user_badge'
const newColumn = 'enabled'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean(newColumn).defaultTo(true)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
