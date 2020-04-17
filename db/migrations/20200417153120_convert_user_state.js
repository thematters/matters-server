exports.up = async (knex) => {
  await knex('user').where({ state: 'frozen' }).update({ state: 'banned' })
}

exports.down = async (knex) => {}
