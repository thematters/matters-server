const table = 'user_reader_materialized'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['state', 'user_name'])
    t.index(['author_score', 'id'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['state', 'user_name'])
    t.dropIndex(['author_score', 'id'])
  })
}
