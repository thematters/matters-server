const { alterEnumString } = require('../utils')

const table = 'action_tag'

exports.up = async (knex) =>
  knex.raw(alterEnumString(table, 'action', ['follow', 'pin']))

exports.down = (knex) => knex.raw(alterEnumString(table, 'action', ['follow']))
