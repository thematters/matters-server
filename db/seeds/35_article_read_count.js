const table = 'article_read_count'

exports.seed = async (knex) => {
  await knex(table).del()
  await knex(table).insert([
    {
      user_id: 1,
      article_id: 1,
      count: 1,
      archived: false,
      read_time: 0,
      last_read: knex.fn.now(),
    },
    {
      user_id: 2,
      article_id: 1,
      count: 1,
      archived: false,
      read_time: 0,
      last_read: knex.fn.now(),
    },
    {
      user_id: 3,
      article_id: 1,
      count: 1,
      archived: false,
      read_time: 0,
      last_read: knex.fn.now(),
    },
    {
      user_id: 4,
      article_id: 1,
      count: 1,
      archived: false,
      read_time: 0,
      last_read: knex.fn.now(),
    },
    {
      user_id: 5,
      article_id: 1,
      count: 1,
      archived: false,
      read_time: 0,
      last_read: knex.fn.now(),
    },
  ])
}
