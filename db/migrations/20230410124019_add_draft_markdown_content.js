const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.text('content_md')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('content_md')
  })
}
