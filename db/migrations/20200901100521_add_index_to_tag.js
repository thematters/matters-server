const table = 'tag'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index('owner')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex('owner')
  })
}
