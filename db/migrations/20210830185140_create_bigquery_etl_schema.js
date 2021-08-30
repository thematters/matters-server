const { baseDown } = require('../utils')

const schema = 'bq_etl'
const table = 'bq_traffic'

exports.up = async (knex) => {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
  await knex.schema.createTable(`${schema}.${table}`, (t) => {
    t.bigIncrements('id').primary()
    t.timestamp('event_date').notNullable()
    t.text('target_type').notNullable()
    t.bigInteger('target_id').unsigned().notNullable()
    t.text('source_type').notNullable()
    t.text('source').notNullable()
    t.bigInteger('count').notNullable()

    t.unique([
      'event_date',
      'target_type',
      'target_id',
      'source_type',
      'source',
    ])
  })
}

exports.down = async (knex) => {
  await baseDown(`${schema}.${table}`)(knex)
  await knex.raw(`DROP SCHEMA IF EXISTS ${schema}`)
}
