import { customAlphabet } from 'nanoid'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const shortHash = customAlphabet(ALPHABET, 12)

const table = 'tag_channel'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.string('short_hash').unique()
  })

  // backfill existing rows
  const records = await knex(table).select('id')
  for (const record of records) {
    await knex(table)
      .where({ id: record.id })
      .update({ short_hash: shortHash() })
  }

  await knex.raw(`ALTER TABLE ${table} ALTER COLUMN short_hash SET NOT NULL`)
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('short_hash')
  })
}
