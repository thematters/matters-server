const table = 'seeding_user'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.unique(['user_id'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropUnique(['user_id'])
  })
}
