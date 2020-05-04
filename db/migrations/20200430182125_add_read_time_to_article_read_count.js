const table = 'article_read_count'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.bigInteger('read_time').defaultTo(0)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('read_time')
  })
}
