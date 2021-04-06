const table = 'article_circle'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.enu('access', ['public', 'paywall']).notNullable().defaultTo('paywall')
    t.text('secret')

    t.index('access')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex('access')

    t.dropColumn('secret')
    t.dropColumn('access')
  })
}
