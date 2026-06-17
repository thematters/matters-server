const table = 'campaign'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    // whether this campaign exposes a quote wall (post-to-wall affordance).
    // opt-in: defaults to false; 七日書 campaigns are enabled via data backfill
    // and, going forward, via the OSS campaign editor toggle.
    t.boolean('enable_quote_wall').notNullable().defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('enable_quote_wall')
  })
}
