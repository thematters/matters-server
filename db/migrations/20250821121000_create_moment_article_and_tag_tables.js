import { baseDown } from '../utils.js'

const momentArticleTable = 'moment_article'
const momentTagTable = 'moment_tag'

export const up = async (knex) => {
  // Create moment_article table
  await knex('entity_type').insert({ table: momentArticleTable })
  await knex.schema.createTable(momentArticleTable, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('moment_id').unsigned().notNullable()
    t.bigInteger('article_id').unsigned().notNullable()
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())

    t.foreign('moment_id').references('id').inTable('moment')
    t.foreign('article_id').references('id').inTable('article')

    // Ensure a moment links to at most one article
    t.unique(['moment_id'])

    t.index('moment_id')
    t.index('article_id')
    t.index('created_at')
  })

  // Create moment_tag table
  await knex('entity_type').insert({ table: momentTagTable })
  await knex.schema.createTable(momentTagTable, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('moment_id').unsigned().notNullable()
    t.bigInteger('tag_id').unsigned().notNullable()
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())

    t.foreign('moment_id').references('id').inTable('moment')
    t.foreign('tag_id').references('id').inTable('tag')

    // Ensure a moment links to at most one tag
    t.unique(['moment_id'])

    t.index('moment_id')
    t.index('tag_id')
    t.index('created_at')
  })
}

export const down = async (knex) => {
  await baseDown(momentTagTable)(knex)
  await baseDown(momentArticleTable)(knex)
}
