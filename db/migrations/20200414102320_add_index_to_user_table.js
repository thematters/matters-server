const table_user = 'user'

exports.up = async (knex) => {
  // user
  await knex.schema.table(table_user, (t) => {
    t.index('uuid')
  })
}

exports.down = async (knex) => {
  // user
  await knex.schema.table(table_user, (t) => {
    t.dropIndex('uuid')
  })
}
