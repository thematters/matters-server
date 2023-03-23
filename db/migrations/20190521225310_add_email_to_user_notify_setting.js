const table = 'user_notify_setting'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('email').notNullable().defaultTo(true)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('email')
  })
}
