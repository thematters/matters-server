const table = 'tag'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index('creator')
  })

  await knex.raw(
    `CREATE INDEX tag_editors on "${table}" USING GIN ("editors");`
  )
}

exports.down = async (knex) => {
  await knex.raw(`DROP INDEX tag_editors`)

  await knex.schema.table(table, (t) => {
    t.dropIndex('creator')
  })
}
