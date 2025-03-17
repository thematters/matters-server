import { baseDown } from '../utils.js'

const table = 'transaction'

export const up = async (knex) => {
  // rename old transaction table
  await knex.schema.renameTable(table, 'transaction_obsolete')

  // new transaction table
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()

    // sync with `pending_like` for LIKE
    t.decimal('amount', 36, 18)
    t.enu('currency', ['HKD', 'LIKE']).notNullable()

    t.enu('state', ['pending', 'succeeded', 'failed', 'canceled'])
      .notNullable()
      .defaultTo('pending')
    t.enu('purpose', ['donation', 'add-credit', 'refund', 'fee']).notNullable()

    t.enu('provider', ['stripe']).notNullable().defaultTo('stripe')
    t.string('provider_tx_id').notNullable().unique()

    t.bigInteger('sender_id').unsigned()
    t.bigInteger('recipient_id').unsigned()

    // could be article, transaction or tag table
    t.bigInteger('target_id').unsigned()
    t.bigInteger('target_type').unsigned()

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Adds indexes
    t.index('state')
      .index('currency')
      .index('purpose')
      .index('sender_id')
      .index('recipient_id')
      .index('created_at')

    // Setup foreign key
    t.foreign('sender_id').references('id').inTable('user')
    t.foreign('recipient_id').references('id').inTable('user')
    t.foreign('target_type').references('id').inTable('entity_type')
  })
}

export const down = async (knex) => {
  await knex.schema.dropTable(table)
  await knex.schema.renameTable('transaction_obsolete', table)
}
