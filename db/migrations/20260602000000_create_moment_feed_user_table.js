import { baseDown } from '../utils.js'

const table = 'moment_feed_user'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })

  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()
    t.enu('state', ['pending', 'approved', 'rejected', 'revoked'])
      .notNullable()
      .defaultTo('pending')
    t.enu('reviewed_by', ['admin', 'system', 'seed']).nullable()
    t.bigInteger('reviewer_id').unsigned().nullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('user_id').references('id').inTable('user')
    t.foreign('reviewer_id').references('id').inTable('user')

    t.unique(['user_id'])
    t.index('user_id')
    t.index('state')
    t.index('created_at')
  })
}

export const down = baseDown(table)
