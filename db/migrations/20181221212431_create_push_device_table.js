import { baseDown } from '../utils.js'

const table = 'push_device'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.text('device_id').notNullable().unique()
    t.bigInteger('user_id').unsigned() // null for anonymous
    t.enu('provider', ['jpush', 'fcm']).notNullable().defaultTo('jpush')
    t.text('user_agent')
    t.text('version')
    t.enu('platform', ['ios', 'android', 'web']).notNullable()

    // Setup foreign key
    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
