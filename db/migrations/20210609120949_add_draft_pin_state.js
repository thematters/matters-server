const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.enu('pin_state', ['pinned', 'pinning', 'failed'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('pin_state')
  })
}
