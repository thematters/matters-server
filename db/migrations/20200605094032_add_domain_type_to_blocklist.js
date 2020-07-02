const { alterEnumString } = require('../utils')

const table = 'blocklist'

exports.up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', ['agent_hash', 'email', 'domain'])
  )
}

exports.down = async (knex) => {}
