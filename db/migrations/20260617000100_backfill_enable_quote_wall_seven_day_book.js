const table = 'campaign'

// One-time backfill: enable the quote wall for existing 七日書 campaigns.
// The name match is used here ONCE (at migration time) only; from now on the
// flag is data-driven (toggled in the OSS campaign editor), so renaming a
// campaign no longer affects quote-wall eligibility.
export const up = async (knex) => {
  await knex(table).where('name', 'like', '%七日書%').update({
    enable_quote_wall: true,
  })
}

export const down = async (knex) => {
  await knex(table).where('name', 'like', '%七日書%').update({
    enable_quote_wall: false,
  })
}
