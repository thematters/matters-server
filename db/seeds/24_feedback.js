const table = {
  feedback: 'feedback',
  feedback_asset: 'feedback_asset',
}

export const seed = async (knex) => {
  // create feedback
  await knex(table.feedback).insert([
    {
      user_id: '2',
      category: 'product',
    },
    {
      category: 'product',
      description: '123456',
      contact: '+1 777 777 7777',
    },
  ])

  // create feedback asset
  await knex(table.feedback_asset).insert([
    {
      feedback_id: '1',
      asset_id: '10',
    },
  ])
}
