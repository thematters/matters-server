const { baseDown } = require('../utils')

const table = 'push_device'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.text('device_id')
      .notNullable()
      .unique()
    t.bigInteger('user_id') // anonymous
    t.enu('provider', ['jpush', 'fcm']).defaultTo('jpush')
    t.text('user_agent')
    t.text('version')
    t.enu('platform', ['ios', 'android', 'web'])

    // Setup foreign key
    t.foreign('user_id')
      .references('id')
      .inTable('user')
  })
}

exports.down = baseDown(table)
