const table = 'article'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('is_spam_by_admin').nullable()

    t.index('is_spam_by_admin')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex('is_spam_by_admin')

    t.dropColumn('is_spam_by_admin')
  })
}
