const table = 'circle_subscription_item'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('archived').defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('archived')
  })
}
