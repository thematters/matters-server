const table = 'user'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.jsonb('publish_rate')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('publish_rate')
  })
}
