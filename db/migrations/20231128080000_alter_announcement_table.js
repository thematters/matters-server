const table = 'announcement'

const newColumn = 'expired_at'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.timestamp(newColumn)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
