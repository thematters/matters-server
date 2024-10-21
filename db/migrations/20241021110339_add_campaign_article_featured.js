const table = 'campaign_article'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('featured').defaultTo(false)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('featured')
  })
}
