const { baseDown } = require('../utils')

const table = 'article_ga4_data'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })

  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').unsigned().notNullable().index()
    t.specificType('date_range', 'daterange')
      .notNullable()
      .index('date_range_index', 'gist')
    t.bigInteger('total_users').unsigned().notNullable()

    t.foreign('article_id').references('id').inTable('article')
  })
  // avoid overlapping date ranges for the same article
  // https://www.postgresql.org/docs/current/rangetypes.html#RANGETYPES-CONSTRAINT
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "btree_gist"')
  await knex.raw(
    `ALTER TABLE "${table}" ADD CONSTRAINT "date_range_check" EXCLUDE USING GIST (article_id WITH =, date_range WITH &&)`
  )
}

exports.down = baseDown(table)
