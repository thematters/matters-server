const table = 'blocklist'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.text('note')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('note')
  })
}
