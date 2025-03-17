import { baseDown } from '../utils.js'

const newName = 'article_connection'
const oldName = 'collection'

export const up = async (knex) => {
  await knex('entity_type').update({ table: newName }).where({ table: oldName })
  await knex.schema.renameTable(oldName, newName)
}

export const down = async (knex) => {
  await knex('entity_type').update({ table: oldName }).where({ table: newName })
  await knex.schema.renameTable(newName, oldName)
}
