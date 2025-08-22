import { baseDown } from '../utils.js'

const table = 'tag_channel'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    // Primary key
    t.bigIncrements('id').primary()

    // Foreign keys and columns
    t.bigInteger('tag_id').notNullable()
    t.integer('order').notNullable().defaultTo(0)
    t.boolean('enabled').notNullable().defaultTo(false)
    t.string('navbar_title').nullable()

    // Timestamps
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Constraints
    t.unique(['tag_id'])
    t.foreign('tag_id').references('id').inTable('tag')
  })
}

export const down = baseDown(table)
