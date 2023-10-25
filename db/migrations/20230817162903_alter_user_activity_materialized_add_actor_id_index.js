const table = 'user_activity_materialized'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['actor_id'])
    t.index(['created_at'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['actor_id'])
    t.dropIndex(['created_at'])
  })
}
