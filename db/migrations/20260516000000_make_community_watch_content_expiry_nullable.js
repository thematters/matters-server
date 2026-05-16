const table = 'community_watch_action'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.timestamp('content_expires_at').nullable().alter()
  })
}

export const down = async (knex) => {
  await knex.raw(`
    UPDATE ${table}
    SET content_expires_at = COALESCE(content_expires_at, created_at + INTERVAL '7 days')
  `)

  await knex.schema.alterTable(table, (t) => {
    t.timestamp('content_expires_at').notNullable().alter()
  })
}
