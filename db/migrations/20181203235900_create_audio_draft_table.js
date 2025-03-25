import { baseDown } from '../utils.js'

const table = 'audio_draft'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.bigInteger('author_id').unsigned().notNullable()
    t.string('title').notNullable()
    t.bigInteger('audio').unsigned().notNullable()
    t.integer('length').notNullable().defaultTo(0)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Set foreign key
    t.foreign('author_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
