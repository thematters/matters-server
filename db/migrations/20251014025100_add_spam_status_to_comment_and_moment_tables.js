export const up = async (knex) => {
  // Add spam status columns to comment table
  await knex.schema.table('comment', (t) => {
    t.float('spam_score').nullable()
    t.boolean('is_spam').nullable()

    t.index('spam_score')
  })

  // Add spam status columns to moment table
  await knex.schema.table('moment', (t) => {
    t.float('spam_score').nullable()
    t.boolean('is_spam').nullable()

    t.index('spam_score')
  })
}

export const down = async (knex) => {
  // Remove spam status columns from comment table
  await knex.schema.table('comment', (t) => {
    t.dropIndex('spam_score')
    t.dropIndex('is_spam')

    t.dropColumn('spam_score')
  })

  // Remove spam status columns from moment table
  await knex.schema.table('moment', (t) => {
    t.dropIndex('spam_score')
    t.dropIndex('is_spam')

    t.dropColumn('spam_score')
  })
}
