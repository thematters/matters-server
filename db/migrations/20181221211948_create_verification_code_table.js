import { baseDown } from '../utils.js'

const table = 'verification_code'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.timestamp('expired_at')
    t.timestamp('verified_at')
    t.timestamp('used_at')
    t.string('code').notNullable()
    t.enu('type', [
      'register',
      'email_reset',
      'password_reset',
      'email_verify',
    ]).notNullable()
    t.enu('status', ['active', 'inactive', 'verified', 'expired', 'used'])
      .notNullable()
      .defaultTo('active')
    t.bigInteger('user_id').unsigned()
    t.string('email')

    // Setup foreign key
    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
