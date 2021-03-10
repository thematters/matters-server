const customer = 'customer'

exports.up = async (knex) => {
  await knex.schema.table(customer, function (t) {
    t.string('card_last_4')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(customer, function (t) {
    t.dropColumn('card_last_4')
  })
}
