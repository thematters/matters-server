import { baseDown } from '../utils.js'

const table = 'user_oauth_likecoin'

export const up = async (knex) => {
  await knex('entity_type').insert({
    table,
  })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.string('liker_id').unique().notNullable()
    t.enu('account_type', ['temporal', 'general'])
      .notNullable()
      .defaultTo('temporal')
    t.text('access_token').notNullable()
    t.text('refresh_token')
    t.timestamp('expires')
    t.text('scope')

    // Setup foreign key
    t.foreign('liker_id').references('liker_id').inTable('user')
  })
}

export const down = baseDown(table)
