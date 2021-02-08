const table = 'seeding_user'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.unique(['user_id'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropUnique(['user_id'])
  })
}
