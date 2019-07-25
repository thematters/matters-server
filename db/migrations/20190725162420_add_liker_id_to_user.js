const table = 'user'
const column = 'liker_id'

exports.up = async knex => {
  await knex.schema.table(table, function (t) {
    t.string(column).unique()
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function (t) {
    t.dropColumn(column)
  })
}
