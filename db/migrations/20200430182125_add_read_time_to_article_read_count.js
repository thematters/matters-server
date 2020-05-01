const table = 'article_read_count'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.bigInteger('read_time').defaultTo(0)
    t.text('description')
    t.specificType('editors', 'text ARRAY')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('cover')
    t.dropColumn('description')
    t.dropColumn('editors')
  })
}
