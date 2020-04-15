const table = 'article'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['author_id', 'state'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['author_id', 'state'])
  })
}
