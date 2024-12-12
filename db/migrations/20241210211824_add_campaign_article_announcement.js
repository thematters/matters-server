const table = 'campaign_article'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('announcement').defaultTo(false)
  })

  // migrate records that `campaign_stage_id` is null
  await knex(table)
    .whereNull('campaign_stage_id')
    .update({ announcement: true })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('announcement')
  })
}
