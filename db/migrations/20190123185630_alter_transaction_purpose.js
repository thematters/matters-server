const { alterEnumString } = require('../utils')

const table = 'transaction'

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
}

exports.down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'purpose', [
      'appreciate',
      'appreciate-comment',
      'invitation-accepted',
      'join-by-invitation',
      'join-by-task',
      'first-post',
      'system-subsidy',
    ])
  )
}
