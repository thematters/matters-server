const { alterEnumString } = require('../utils')

const table = 'action_user'

exports.up = async (knex) => {
  await knex.raw(alterEnumString(table, 'action', ['follow', 'rate', 'block']))
}

exports.down = async (knex) => {
  await knex.raw(alterEnumString(table, 'action', ['follow', 'rate']))
}
