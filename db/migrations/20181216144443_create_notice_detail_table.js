import { baseDown } from '../utils.js'

const table = 'notice_detail'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.string('notice_type').notNullable()
    t.text('message')
    t.jsonb('data')
  })
}

export const down = baseDown(table)
