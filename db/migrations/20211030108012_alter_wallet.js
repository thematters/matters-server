const table = 'crypto_wallet'

const indexName = `${table}_address_archived_unique`

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('archived').defaultTo(false)
    t.dropUnique(['address'])
  })

  // create a partial unique index
  await knex.raw(
    `CREATE UNIQUE INDEX ${indexName} ON ${table} ("address", "archived") WHERE "archived" IS FALSE`
  )
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('archived')
    t.unique(['address'])
  })
  await knex.raw(`DROP INDEX IF EXISTS ${indexName}`)
}
