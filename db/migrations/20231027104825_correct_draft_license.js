const draft_table = 'draft'

export const up = async (knex) => {
  await knex.raw(`
    UPDATE
      ${draft_table}
    SET
      license = 'cc_by_nc_nd_4'
    WHERE
      license = 'cc_by_nc_nd_2'
      AND publish_state != 'published'
  `)
}

export const down = async (knex) => {
  await knex.raw(`
    UPDATE
      ${draft_table}
    SET
      license = 'cc_by_nc_nd_2'
    WHERE
      license = 'cc_by_nc_nd_4'
      AND publish_state != 'published'
  `)
}
