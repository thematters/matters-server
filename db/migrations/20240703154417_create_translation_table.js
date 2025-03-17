import { baseDown } from '../utils.js'

const table = 'translation'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('entity_type_id').unsigned().notNullable()
    t.bigInteger('entity_id').unsigned().notNullable()
    t.string('entity_field').notNullable()
    t.text('text').notNullable()
    t.enu('language', ['zh_hant', 'zh_hans', 'en']).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    t.unique(['entity_type_id', 'entity_id', 'entity_field', 'language'])
    t.foreign('entity_type_id').references('id').inTable('entity_type')
  })
}

export const down = baseDown(table)
