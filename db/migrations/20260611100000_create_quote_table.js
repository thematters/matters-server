import { baseDown } from '../utils.js'

const table = 'quote'

const indexName = `${table}_user_id_article_id_content_unique`

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.text('content').notNullable()
    t.bigInteger('article_id').unsigned().notNullable()
    t.bigInteger('campaign_id').unsigned().notNullable()
    t.bigInteger('user_id').unsigned().notNullable()
    t.enu('state', ['active', 'archived', 'banned']).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('article_id').references('id').inTable('article')
    t.foreign('campaign_id').references('id').inTable('campaign')
    t.foreign('user_id').references('id').inTable('user')

    t.index('campaign_id')
    t.index('article_id')
    t.index(['user_id', 'created_at'])
  })

  // create a partial unique index to dedupe active quotes
  await knex.raw(
    `CREATE UNIQUE INDEX ${indexName} ON ${table} ("user_id", "article_id", "content") WHERE state = 'active'`
  )
}

export const down = baseDown(table)
