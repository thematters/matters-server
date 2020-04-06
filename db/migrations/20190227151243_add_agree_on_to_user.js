const table = 'user'
const column = 'agree_on'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.timestamp(column)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn(column)
  })
}
