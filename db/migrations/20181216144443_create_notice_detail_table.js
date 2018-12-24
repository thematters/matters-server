const { baseDown } = require('../utils')

const table = 'notice_detail'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.string('notice_type').notNullable()
    t.text('message')
    t.json('data')
  })
}

exports.down = baseDown(table)
