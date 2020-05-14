const { baseDown } = require('../utils')

const table = 'feature_flag'

exports.up = async (knex) => {
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('feature').notNullable().unique()
    t.enu('flag', ['on', 'off', 'admin_only']).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
  })

  await knex(table).insert([
    { feature: 'add_credit', flag: 'admin_only' },
    { feature: 'payment', flag: 'admin_only' },
    { feature: 'payout', flag: 'admin_only' },
  ])
}

exports.down = baseDown(table)
