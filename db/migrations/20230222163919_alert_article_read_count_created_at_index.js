const table = 'article_read_count'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['created_at'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['created_at'])
  })
}
