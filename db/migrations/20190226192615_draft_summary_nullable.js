const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.text('summary').nullable().alter()
  })
}

exports.down = async (knex) => {}
