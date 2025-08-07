const table = 'curation_channel'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('show_recommendation').notNullable().defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('show_recommendation')
  })
}
