const { baseDown } = require('../utils')

const table = 'blockchain_curation_event'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('amount')
  })
  await knex.schema.alterTable(table, (t) => {
    t.decimal('amount', 78, 0).notNullable()
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('amount')
  })
  await knex.schema.alterTable(table, (t) => {
    t.bigInteger('amount').unsigned().notNullable()
  })
}
