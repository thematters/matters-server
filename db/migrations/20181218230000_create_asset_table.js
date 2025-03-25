import { baseDown } from '../utils.js'

const table = 'asset'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.bigInteger('author_id').unsigned().notNullable()
    t.string('type').notNullable()
    t.string('path').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Set foreign key
    t.foreign('author_id').references('id').inTable('user')
  })
  await knex.schema.alterTable('user', (t) => {
    t.foreign('avatar').references('id').inTable('asset')
  })
  await knex.schema.alterTable('article', (t) => {
    t.foreign('cover').references('id').inTable('asset')
  })
  await knex.schema.alterTable('draft', (t) => {
    t.foreign('cover').references('id').inTable('asset')
  })
  await knex.schema.alterTable('audio_draft', (t) => {
    t.foreign('audio').references('id').inTable('asset')
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable('user', function (t) {
    t.dropForeign('avatar')
  })
  await knex.schema.alterTable('article', function (t) {
    t.dropForeign('cover')
  })
  await knex.schema.alterTable('draft', function (t) {
    t.dropForeign('cover')
  })
  await knex.schema.alterTable('audio_draft', function (t) {
    t.dropForeign('audio')
  })
  await baseDown(table)(knex)
}
