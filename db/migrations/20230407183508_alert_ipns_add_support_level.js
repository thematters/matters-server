const table = 'user_ipns_keys'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.enu('support_level', ['traveloggers', 'vip']) // nullable
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('support_level')
  })
}
