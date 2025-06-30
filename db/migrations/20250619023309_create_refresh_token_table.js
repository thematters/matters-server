import { baseDown } from '../utils.js'

const table = 'refresh_token'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').references('id').inTable('user').notNullable()
    t.string('token_hash').notNullable()
    t.enu('revoke_reason', [
      'user_logout',
      'token_invalid',
      'token_rotation',
      'token_reused',
      'admin_revoke',
    ]).nullable()

    t.timestamp('expired_at').notNullable()
    t.timestamp('revoked_at').nullable()
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())

    // Optional metadata fields
    t.string('user_agent').nullable()
    t.string('agent_hash').nullable()

    // Add indexes
    t.unique(['token_hash'])
    t.index(['user_id'])
    t.index(['agent_hash'])
  })
}

export const down = baseDown(table)
