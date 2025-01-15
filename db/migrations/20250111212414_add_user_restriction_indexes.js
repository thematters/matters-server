const table = 'user_restriction'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index('type')
    t.unique(['user_id', 'type'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropUnique(['user_id', 'type'])
    t.dropIndex('type')
  })
}
