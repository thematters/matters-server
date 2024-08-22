const table = 'campaign_article'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.bigInteger('campaign_stage_id').unsigned().nullable().alter()
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.bigInteger('campaign_stage_id').unsigned().notNullable().alter()
  })
}
