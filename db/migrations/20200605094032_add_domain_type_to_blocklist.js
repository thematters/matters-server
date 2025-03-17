import { alterEnumString } from '../utils.js'

const table = 'blocklist'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', ['agent_hash', 'email', 'domain'])
  )
}

export const down = async (knex) => {}
