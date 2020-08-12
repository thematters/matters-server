const { alterEnumString } = require('../utils')

const table = 'appreciation'

exports.up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'purpose', [
      'appreciate',
      'superlike',
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
      'appreciate-subsidy',
      'invitation-accepted',
      'join-by-invitation',
      'join-by-task',
      'first-post',
      'system-subsidy',
    ])
  )
}
