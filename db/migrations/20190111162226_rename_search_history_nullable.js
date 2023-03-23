export const up = async (knex) => {
  await knex.schema.renameTable('serach_history', 'search_history')
  await knex.schema.alterTable('search_history', (table) => {
    table.bigInteger('user_id').nullable().alter()
  })
}

export const down = async (knex) => {
  await knex.schema.renameTable('search_history', 'serach_history')
}
