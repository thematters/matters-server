const table = 'customer'

exports.seed = async (knex) => {
  await knex(table).del()
  await knex(table).insert([
    {
      user_id: 5,
      provider: 'stripe',
      archived: false,
      customer_id: 'test-customer-id',
      card_last_4: '2222',
    },
  ])
}
