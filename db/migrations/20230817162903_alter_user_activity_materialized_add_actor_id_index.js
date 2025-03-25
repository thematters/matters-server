const table = 'user_activity_materialized'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['actor_id'])
    t.index(['created_at'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['actor_id'])
    t.dropIndex(['created_at'])
  })
}
