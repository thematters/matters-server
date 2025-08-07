const table = 'article'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('channel_enabled').defaultTo(true).notNullable()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('channel_enabled')
  })
}
