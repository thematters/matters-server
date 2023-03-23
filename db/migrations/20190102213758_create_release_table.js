import { baseDown } from '../utils.js'

const table = 'release'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('title')
    t.text('description')
    t.bigInteger('cover').unsigned()
    t.string('link')
    t.enu('platform', ['ios', 'android']).notNullable()
    t.enu('channel', ['appStore', 'googlePlay']).notNullable()
    t.string('version').notNullable()
    t.boolean('latest').defaultTo(false)
    t.boolean('force_update').defaultTo(false)
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.unique(['platform', 'channel', 'version'])

    t.foreign('cover').references('id').inTable('asset')
  })
}

export const down = baseDown(table)
