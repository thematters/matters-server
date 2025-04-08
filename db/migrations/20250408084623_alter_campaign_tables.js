import { baseDown } from '../utils.js'

export const up = async (knex) => {
  await knex.schema.alterTable('campaign', (t) => {
    t.specificType('admin_user_ids', 'bigint ARRAY')
  })
  await knex.schema.alterTable('campaign_article', (t) => {
    t.boolean('enabled').notNullable().defaultTo(true)
    t.dateTime('updated_at').nullable()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable('campaign', (t) => {
    t.dropColumn('admin_user_ids')
  })
  await knex.schema.alterTable('campaign_article', (t) => {
    t.dropColumn('enabled')
    t.dropColumn('updated_at')
  })
}
