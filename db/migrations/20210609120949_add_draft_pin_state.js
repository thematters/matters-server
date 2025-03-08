const table = 'draft'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.enu('pin_state', ['pinned', 'pinning', 'failed'])

    t.index('pin_state')
  })

  // mark `pin_state` of published drafts as `pinning` then wait to
  // be verified by cronjob.
  await knex.raw(`
    UPDATE ${table}
    SET pin_state = 'pinning'
    WHERE publish_state = 'published'
      AND data_hash IS NOT NULL
  `)
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('pin_state')
  })
}
