const table = 'circle_subscription_item'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('archived').defaultTo(false)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('archived')
  })
}
