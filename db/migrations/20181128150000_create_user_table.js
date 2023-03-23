import { baseDown } from '../utils.js'

const table = 'user'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.string('user_name').notNullable().unique()
    t.string('display_name').notNullable()
    t.text('description')
    t.bigInteger('avatar').unsigned()
    t.string('email').notNullable().unique()
    t.boolean('email_verified').defaultTo(false)
    t.string('mobile')
    t.text('password_hash').notNullable()
    t.integer('read_speed').defaultTo(500)
    t.integer('base_gravity').notNullable().defaultTo(0)
    t.integer('curr_gravity').notNullable().defaultTo(0)
    t.enu('language', ['zh_hant', 'zh_hans', 'en'])
      .notNullable()
      .defaultTo('zh_hant')
    t.enu('role', ['user', 'admin']).notNullable().defaultTo('user')
    t.enu('state', ['onboarding', 'active', 'banned', 'frozen', 'archived'])
      .notNullable()
      .defaultTo('active')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

export const down = baseDown(table)
