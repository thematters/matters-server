const table = 'user_notify_setting'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.boolean('push')
      .notNullable()
      .defaultTo(true)
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function(t) {
    t.dropColumn('push')
  })
}
