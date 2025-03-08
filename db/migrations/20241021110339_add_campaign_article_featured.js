const table = 'campaign_article'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('featured').defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('featured')
  })
}
