const { baseDown } = require('../utils')

const table = 'search_history'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex(table).insert({ search_key: '你好', user_id: '5' })
  await knex(table).insert({ search_key: '你好', user_id: '5' })
  await knex(table).insert({ search_key: '香港', user_id: '5' })

}

exports.down = baseDown(table)
