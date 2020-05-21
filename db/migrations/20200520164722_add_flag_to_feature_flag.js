const table = 'feature_flag'

exports.up = async (knex) => {
  // TODO: drop `enable` field on next migration
  await knex.schema.table(table, (t) => {
    t.enu('flag', ['on', 'off', 'admin']).notNullable().defaultTo('off')
  })

  const updateField = (name, flag) =>
    knex(table).where({ name }).update({
      flag,
      updated_at: knex.fn.now(),
    })

  await updateField('add_credit', 'admin')
  await updateField('payment', 'admin')
  await updateField('payout', 'off')
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('flag')
  })
}
