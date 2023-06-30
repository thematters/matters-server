const { baseDown } = require('../utils')

const newName = 'article_connection'
const oldName = 'collection'

exports.up = async (knex) => {
  await knex('entity_type').update({ table: newName }).where({ table: oldName })
  await knex.schema.renameTable(oldName, newName)
}

exports.down = async (knex) => {
  await knex('entity_type').update({ table: oldName }).where({ table: newName })
  await knex.schema.renameTable(newName, oldName)
}
