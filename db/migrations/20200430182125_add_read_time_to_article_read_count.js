const table = 'article_read_count'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.bigInteger('read_time').defaultTo(0)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('read_time')
  })
}
