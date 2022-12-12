const { baseDown } = require('../utils')

const table = 'user'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.timestamp('visited_at').defaultTo(knex.fn.now())
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('visited_at')
  })
}
