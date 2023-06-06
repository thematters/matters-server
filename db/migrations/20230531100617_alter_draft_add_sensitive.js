const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('sensitive_by_author').notNullable().defaultTo(false)
    t.boolean('sensitive_by_admin').notNullable().defaultTo(false)
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('sensitive_by_author')
    t.dropColumn('sensitive_by_admin')
  })
}
