const table_user = 'article'

exports.up = async (knex) => {
  await knex.schema.table(table_user, (t) => {
    t.index(['author_id', 'state'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table_user, (t) => {
    t.dropIndex(['author_id', 'state'])
  })
}
