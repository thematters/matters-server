const draft_table = 'draft'

export const up = async (knex) => {
  // add `license` column
  await knex.schema.table(draft_table, (t) => {
    t.enu('license', ['cc_0', 'cc_by_nc_nd_2', 'arr'])
      .notNullable()
      .defaultTo('cc_by_nc_nd_2')
  })
}

export const down = async (knex) => {
  await knex.schema.table(draft_table, (t) => {
    t.dropColumn('license')
  })
}
