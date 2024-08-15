const table = 'article'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['id', 'state', 'author_id'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['id', 'state', 'author_id'])
  })
}
