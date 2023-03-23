const table = 'article_circle'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.enu('access', ['public', 'paywall']).notNullable().defaultTo('paywall')
    t.text('secret')

    t.index('access')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex('access')

    t.dropColumn('secret')
    t.dropColumn('access')
  })
}
