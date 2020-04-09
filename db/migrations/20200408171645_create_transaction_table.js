const { baseDown } = require('../utils')

const table = 'transaction'

exports.up = async (knex) => {
  // drop transaction_delta_view
  await knex.raw(/*sql*/ `drop view transaction_delta_view`)

  // rename old transaction table
  await knex.schema.renameTable(table, 'transaction_obsolete')

  // new transaction table
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable()
    t.bigInteger('sender')
    t.bigInteger('recipient')
    t.enu('currency', ['HKD', 'LIKE']).notNullable()
    t.enu('purpose', [
      'donation',
      'add-credit',
      'refund',
      'fee',
      'purchase',
    ]).notNullable()
    t.bigInteger('target')
    // could be article, transaction or tag table
    t.bigInteger('target_entity').unsigned()
    t.foreign('target_entity').references('id').inTable('entity_type')

    t.float('amount').notNullable()
    t.enu('state', ['pending', 'succeeded', 'failed', 'canceled'])
      .notNullable()
      .defaultTo('pending')

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
  })

  // add index
  return knex.schema.table(table, (t) => {
    t.index(['currency', 'state', 'uuid', 'sender', 'recipient'])
  })
}

exports.down = async (knex) => {
  await baseDown(table)(knex)
  return knex.schema.renameTable('transaction_obsolete', table)
}
