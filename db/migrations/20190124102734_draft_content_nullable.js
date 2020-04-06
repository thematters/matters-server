const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.text('content').nullable().alter()
  })
}

exports.down = async (knex) => {}
