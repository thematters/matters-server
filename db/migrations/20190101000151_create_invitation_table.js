const { baseDown } = require('../utils')

const table = 'invitation'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    // sender_id is not referenced to user_id since it can come from system
    t.bigIncrements('id').primary()
    t.bigInteger('sender_id')
    t.bigInteger('recipient_id')
    t.enu('status', ['pending', 'activated'])
    t.string('email').unique()
    t.timestamp('created_at').defaultTo(knex.fn.now())
  })
}

exports.down = baseDown(table)
