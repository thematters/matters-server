import { baseDown } from '../utils.js'

const newName1 = 'topic_channel'
const oldName1 = 'channel'
const newName2 = 'article_topic_channel'
const oldName2 = 'article_channel'

export const up = async (knex) => {
  await knex('entity_type')
    .update({ table: newName1 })
    .where({ table: oldName1 })
  await knex.schema.renameTable(oldName1, newName1)
  await knex.schema.alterTable(newName1, (t) => {
    t.string('note').nullable()
    t.integer('order').notNullable().defaultTo(0)
  })
  await knex('entity_type')
    .update({ table: newName2 })
    .where({ table: oldName2 })
  await knex.schema.renameTable(oldName2, newName2)
}

export const down = async (knex) => {
  await knex.schema.alterTable(newName1, (t) => {
    t.dropColumn('note')
    t.dropColumn('order')
  })
  await knex('entity_type')
    .update({ table: oldName1 })
    .where({ table: newName1 })
  await knex.schema.renameTable(newName1, oldName1)

  await knex('entity_type')
    .update({ table: oldName2 })
    .where({ table: newName2 })
  await knex.schema.renameTable(newName2, oldName2)
}
