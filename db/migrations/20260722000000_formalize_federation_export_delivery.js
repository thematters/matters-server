const table = 'federation_export_event'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.string('action').notNullable().defaultTo('create')
    t.jsonb('result')
    t.text('error')
    t.index(['status', 'updated_at'])
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropIndex(['status', 'updated_at'])
    t.dropColumn('error')
    t.dropColumn('result')
    t.dropColumn('action')
  })
}
