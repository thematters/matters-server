const { baseDown } = require('../utils')

const table = ''

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
  })
}

exports.down = baseDown(table)
