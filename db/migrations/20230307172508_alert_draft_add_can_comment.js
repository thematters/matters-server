const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('can_comment').notNullable().defaultTo(true)
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('can_comment')
  })
}
