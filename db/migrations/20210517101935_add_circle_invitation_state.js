const circle_invitation = 'circle_invitation'

exports.up = async (knex) => {
  // add `state` column
  await knex.schema.table(circle_invitation, (t) => {
    t.enu('state', [
      'pending',
      'accepted',
      'transfer_succeeded',
      'transfer_failed',
    ]).defaultTo('pending')
    t.index('state')
  })

  // update `state` based on `accepted`
  await knex.raw(`
    UPDATE
      ${circle_invitation}
    SET
      state = CASE WHEN accepted = TRUE THEN
        'accepted'
      ELSE
        'pending'
      END
  `)

  // TODO: drop `accepted` column
}

exports.down = async (knex) => {
  await knex.schema.table(circle_invitation, (t) => {
    t.dropIndex('state')
    t.dropColumn('state')
  })
}
