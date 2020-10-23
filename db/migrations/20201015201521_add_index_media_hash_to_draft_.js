const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index('media_hash')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex('media_hash')
  })
}
