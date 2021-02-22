const table = 'user_notify_setting'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('circle_new_follower').notNullable().defaultTo(true)
    t.boolean('circle_new_discussion').notNullable().defaultTo(true)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('circle_new_follower')
    t.dropColumn('circle_new_discussion')
  })
}
