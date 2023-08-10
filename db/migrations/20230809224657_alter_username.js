const table = 'user'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.setNullable('user_name')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropNullable('user_name')
  })
}
