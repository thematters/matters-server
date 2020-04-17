const {
  alterEnumString
} = require('../utils')

const table = 'transaction'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.decimal('fee', 36, 18)
  })

  await knex.raw(alterEnumString(table, 'purpose', ['donation', 'add-credit', 'refund']))
}

exports.down = async (knex) => {
  await knex.raw(alterEnumString(table, 'purpose', ['donation', 'add-credit', 'refund', 'fee']))

  await knex.schema.table(table, (t) => {
    t.dropColumn('fee')
  })
}
