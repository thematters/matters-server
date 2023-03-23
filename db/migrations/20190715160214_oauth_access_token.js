import { baseDown } from '../utils.js'

const table = 'oauth_access_token'

export const up = async (knex) => {
  await knex('entity_type').insert({
    table,
  })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.string('token').notNullable().unique()
    t.bigInteger('client_id').unsigned().notNullable()
    t.bigInteger('user_id').unsigned().notNullable()
    t.timestamp('expires')
    t.text('scope')

    // Setup foreign key
    t.foreign('client_id').references('id').inTable('oauth_client')
    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
