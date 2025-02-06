const { customAlphabet } = require('nanoid')

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const shortHash = customAlphabet(ALPHABET, 12) // ~35 years or 308M IDs needed, in order to have a 1% probability of one collision // https://zelark.github.io/nano-id-cc/

const table = 'channel'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.string('short_hash').unique().notNullable()
  })

  // migration
  const records = await knex(table).select('id')
  for (const record of records) {
    await knex(table)
      .where({ id: record.id })
      .update({ short_hash: shortHash() })
  }
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('short_hash')
  })
}
