import { baseDown } from '../utils.js'

export const up = async (knex) => {
  await knex.schema.alterTable('campaign', (t) => {
    t.specificType('manager_ids', 'bigint ARRAY')
  })
  await knex.schema.alterTable('campaign_article', (t) => {
    t.boolean('enabled').notNullable().defaultTo(true)
    t.boolean('deleted').notNullable().defaultTo(false)
    t.dateTime('updated_at').nullable()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable('campaign', (t) => {
    t.dropColumn('manager_ids')
  })
  await knex.schema.alterTable('campaign_article', (t) => {
    t.dropColumn('enabled')
    t.dropColumn('deleted')
    t.dropColumn('updated_at')
  })
}
