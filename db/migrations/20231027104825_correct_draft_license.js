const draft_table = 'draft'

exports.up = async (knex) => {
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

exports.down = async (knex) => {
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
