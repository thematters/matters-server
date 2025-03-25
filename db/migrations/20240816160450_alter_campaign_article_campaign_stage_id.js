const table = 'campaign_article'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.bigInteger('campaign_stage_id').unsigned().nullable().alter()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.bigInteger('campaign_stage_id').unsigned().notNullable().alter()
  })
}
