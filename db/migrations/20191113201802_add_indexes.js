const comment = 'comment'

const transaction = 'transaction'

export const up = async (knex) => {
  await knex.schema.table(comment, (t) => {
    t.index(['article_id', 'state'])
  })

  await knex.schema.table(transaction, (t) => {
    t.index(['reference_id', 'purpose'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(comment, (t) => {
    t.dropIndex(['article_id', 'state'])
  })

  await knex.schema.table(transaction, (t) => {
    t.dropIndex(['reference_id', 'purpose'])
  })
}
