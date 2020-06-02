const table = 'article_read_count'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.bigInteger('timed_count').defaultTo(0)
  })

  await knex(table).update({
    read_time: 0,
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('timed_count')
  })
}
