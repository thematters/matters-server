const { alterEnumString } = require('../utils')

const table = 'appreciation'

exports.up = async (knex) => {
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

  await knex.raw(/*sql*/ `
    alter table ${table}
      drop constraint if exists ${table}_sender_id_foreign,
      drop constraint if exists ${table}_recipient_id_foreign;
  `)

  return knex.schema.table(table, (t) => {
    t.foreign('sender_id').references('user.id')
    t.foreign('recipient_id').references('user.id')
  })
}

exports.down = (knex) =>
  knex.raw(/*sql*/ `
  alter table ${table}
    drop constraint if exists ${table}_purpose_check,
    drop constraint if exists ${table}_type_check,
    drop constraint if exists ${table}_sender_id_foreign,
    drop constraint if exists ${table}_recipient_id_foreign;
  `)
