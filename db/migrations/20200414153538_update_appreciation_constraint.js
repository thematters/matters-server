import { alterEnumString } from '../utils.js'

const table = 'appreciation'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'purpose', [
      'appreciate',
      'appreciate-comment',
      'appreciate-subsidy',
      'invitation-accepted',
      'join-by-invitation',
      'join-by-task',
      'first-post',
      'system-subsidy',
    ])
  )

  await knex.raw(alterEnumString(table, 'type', ['LIKE', 'MAT']))

  return knex.raw(/*sql*/ `
    alter table ${table}
      drop constraint if exists ${table}_sender_id_foreign,
      drop constraint if exists ${table}_recipient_id_foreign;

    alter table ${table}
      add constraint ${table}_sender_id_foreign foreign key (sender_id) references "user" (id),
      add constraint ${table}_recipient_id_foreign foreign key (recipient_id) references "user" (id);
  `)
}

export const down = (knex) =>
  knex.raw(/*sql*/ `
  alter table ${table}
    drop constraint if exists ${table}_purpose_check,
    drop constraint if exists ${table}_type_check,
    drop constraint if exists ${table}_sender_id_foreign,
    drop constraint if exists ${table}_recipient_id_foreign;
  `)
