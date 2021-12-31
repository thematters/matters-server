const table = 'article_read_count'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.bigInteger('timed_count').defaultTo(0)
    t.timestamp('last_read') // .defaultTo(knex.fn.now())
  })

  return await knex(table).update({
    read_time: 0,
  })
}

exports.down = (knex) =>
  knex.schema.table(table, (t) => {
    t.dropColumn('timed_count')
    t.dropColumn('last_read')
  })
