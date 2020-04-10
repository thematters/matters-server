const table = 'appreciation'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['reference_id', 'purpose'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['reference_id', 'purpose'])
  })
}
