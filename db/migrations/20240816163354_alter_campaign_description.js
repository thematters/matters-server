const table = 'campaign'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.text('description').nullable().alter()
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.text('description').notNullable().alter()
  })
}
