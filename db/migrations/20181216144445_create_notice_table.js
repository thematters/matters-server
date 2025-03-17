import { baseDown } from '../utils.js'

const table = 'notice'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.boolean('unread').defaultTo(true)
    t.boolean('deleted').defaultTo(false)
    t.bigInteger('notice_detail_id').unsigned().notNullable()
    t.bigInteger('recipient_id').unsigned().notNullable()

    // Adds indexes
    t.index(['updated_at'])

    // Set foreign key
    t.foreign('notice_detail_id').references('id').inTable('notice_detail')
    t.foreign('recipient_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
