const table = 'user_notify_setting'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('tag').notNullable().defaultTo(true)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('tag')
  })
}
