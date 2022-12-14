const { baseDown } = require('../utils')

exports.up = async (knex) => {
  await knex.raw(/*sql*/ `
  DO $$
  BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'users_lasts') THEN
      UPDATE public.user SET last_seen = users_lasts.last_at
          FROM mat_views.users_lasts AS users_lasts WHERE public.user.id = users_lasts.id;
  END IF;
  END;
  $$
  `)
}

exports.down = async (knex) => {}
