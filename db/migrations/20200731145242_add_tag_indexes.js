const table = 'tag'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index('creator')
  })

  await knex.raw(
    `CREATE INDEX tag_editors on "${table}" USING GIN ("editors");`
  )
}

export const down = async (knex) => {
  await knex.raw(`DROP INDEX tag_editors`)

  await knex.schema.table(table, (t) => {
    t.dropIndex('creator')
  })
}
