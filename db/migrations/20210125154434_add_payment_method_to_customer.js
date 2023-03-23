const customer = 'customer'

export const up = async (knex) => {
  await knex.schema.table(customer, function (t) {
    t.string('card_last_4')
  })
}

export const down = async (knex) => {
  await knex.schema.table(customer, function (t) {
    t.dropColumn('card_last_4')
  })
}
