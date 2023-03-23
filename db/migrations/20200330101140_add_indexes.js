const table_comment = 'comment'

export const up = async (knex) => {
  // comment
  await knex.schema.table(table_comment, (t) => {
    t.index(['author_id', 'state'])
  })
}

export const down = async (knex) => {
  // comment
  await knex.schema.table(table_comment, (t) => {
    t.dropIndex(['author_id', 'state'])
  })
}
