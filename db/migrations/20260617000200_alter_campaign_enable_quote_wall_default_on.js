const table = 'campaign'

// Interim decision: open the quote wall for every campaign by default, instead
// of the original 七日書-only opt-in. The per-campaign `enable_quote_wall` flag
// is kept (as a future hook for the OSS toggle / 七日書-only restriction); we
// only flip its default to true and enable it on all existing campaigns.
export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('enable_quote_wall').notNullable().defaultTo(true).alter()
  })
  await knex(table).update({ enable_quote_wall: true })
}

export const down = async (knex) => {
  // revert the default; existing per-campaign values are left as-is (the prior
  // mixed state cannot be reconstructed)
  await knex.schema.alterTable(table, (t) => {
    t.boolean('enable_quote_wall').notNullable().defaultTo(false).alter()
  })
}
