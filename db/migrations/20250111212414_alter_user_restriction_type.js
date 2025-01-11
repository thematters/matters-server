const { alterEnumString } = require('../utils')

const table = 'user_restriction'

exports.up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'articleHottest',
      'articleNewest',
      'excludeArticleSpamDetection',
    ])
  )
  await knex.schema.table(table, (t) => {
    t.index('type')
    t.unique(['user_id', 'type'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropUnique(['user_id', 'type'])
    t.dropIndex('type')
  })
  await knex.raw(
    alterEnumString(table, 'type', ['articleHottest', 'articleNewest'])
  )
}
