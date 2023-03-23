import { baseDown } from '../utils.js'

const table = 'tag_boost'

export const up = async (knex) => {
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('tag_id').unsigned().notNullable()
    t.float('boost').defaultTo(1)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('tag_id').references('id').inTable('tag')
  })
}

export const down = baseDown(table)
