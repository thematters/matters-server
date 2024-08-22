const table = 'article'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.float('spam_score').nullable()
    t.boolean('is_spam').nullable()

    t.index('spam_score')
    t.index('is_spam')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex('spam_score')
    t.dropIndex('is_spam')

    t.dropColumn('spam_score')
    t.dropColumn('is_spam')
  })
}
