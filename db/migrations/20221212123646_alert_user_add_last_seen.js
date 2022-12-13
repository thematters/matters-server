const { baseDown } = require('../utils')

const table = 'user'
const column = 'last_seen'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.timestamp(column).defaultTo(knex.fn.now())
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
}
