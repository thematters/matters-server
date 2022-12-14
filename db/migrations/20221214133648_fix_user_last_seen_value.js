const { baseDown } = require('../utils')

exports.up = async (knex) => {
  await knex.raw(/*sql*/ `
  UPDATE public.user SET last_seen = users_lasts.last_at
      FROM mat_views.users_lasts AS users_lasts WHERE public.user.id = users_lasts.id;
  `)
}

exports.down = async (knex) => {}
