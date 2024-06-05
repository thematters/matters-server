const { alterEnumString } = require('../utils')

const table = 'comment'

exports.up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'article',
      'circle_discussion',
      'circle_broadcast',
      'journal',
    ])
  )
}

exports.down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'article',
      'circle_discussion',
      'circle_broadcast',
    ])
  )
}
