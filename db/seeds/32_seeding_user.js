const table = 'seeding_user'

exports.seed = async (knex) => {
  await knex(table).del()
  await knex(table).insert([
    {
      user_id: 1,
    },
  ])
}
