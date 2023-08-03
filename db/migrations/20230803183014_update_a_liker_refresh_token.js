exports.up = async (knex) => {
  await knex.raw(
    `update user_oauth_likecoin set refresh_token = 'test-token' where liker_id = 'kiutest2'`
  )
}

exports.down = async (knex) => {
  await knex.raw(
    `update user_oauth_likecoin set refresh_token = 'l6DLcy7GQsdatVGP7BAfK7_KBZxu9Yh-iPVn8CoBiGA' where liker_id = 'kiutest2'`
  )
}
