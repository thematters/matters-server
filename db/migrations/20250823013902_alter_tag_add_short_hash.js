import { customAlphabet } from 'nanoid'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const shortHash = customAlphabet(ALPHABET, 12)

const table = 'tag'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.string('short_hash').unique().nullable()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('short_hash')
  })
}
