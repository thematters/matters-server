const { baseDown } = require('../utils')

const campaign_table = 'campaign'

const campaign_stage_table = 'campaign_stage'
const campaign_user_table = 'campaign_user'
const campaign_article_table = 'campaign_article'

exports.up = async (knex) => {
  // campaign
  await knex('entity_type').insert({ table: campaign_table })
  await knex.schema.createTable(campaign_table, (t) => {
    t.bigIncrements('id').primary()
    t.string('short_hash').unique().notNullable()
    t.enu('type', ['writing_challenge']).notNullable()
    t.string('name').notNullable()
    t.text('description').notNullable()
    t.text('link').nullable()
    t.bigInteger('cover').unsigned()
    t.specificType('application_period', 'tstzrange').nullable()
    t.specificType('writing_period', 'tstzrange').nullable()
    t.enu('state', ['pending', 'active', 'finished', 'archived']).notNullable()
    t.bigInteger('creator_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    t.foreign('cover').references('id').inTable('asset')
    t.foreign('creator_id').references('id').inTable('user')
    t.index('type')
  })

  // campaign_stage
  await knex('entity_type').insert({ table: campaign_stage_table })
  await knex.schema.createTable(campaign_stage_table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('campaign_id').unsigned().notNullable()
    t.string('name').notNullable()
    t.specificType('period', 'tstzrange')
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    t.unique(['campaign_id', 'name'])
    t.foreign('campaign_id').references('id').inTable(campaign_table)
  })

  // campaign_user
  await knex('entity_type').insert({ table: campaign_user_table })
  await knex.schema.createTable(campaign_user_table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('campaign_id').unsigned().notNullable()
    t.bigInteger('user_id').unsigned().notNullable()
    t.enu('state', ['pending', 'succeeded', 'rejected']).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    t.foreign('campaign_id').references('id').inTable(campaign_table)
    t.foreign('user_id').references('id').inTable('user')
    t.index('campaign_id')
    t.index('user_id')
  })

  // campaign_article
  await knex('entity_type').insert({ table: campaign_article_table })
  await knex.schema.createTable(campaign_article_table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('campaign_id').unsigned().notNullable()
    t.bigInteger('campaign_stage_id').unsigned().notNullable()
    t.bigInteger('article_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

    t.foreign('campaign_id').references('id').inTable(campaign_table)
    t.foreign('campaign_stage_id')
      .references('id')
      .inTable(campaign_stage_table)
    t.foreign('article_id').references('id').inTable('article')
    t.index(['campaign_id', 'campaign_stage_id'])
    t.index('article_id')
  })
}

exports.down = async (knex) => {
  await baseDown(campaign_article_table)(knex)
  await baseDown(campaign_user_table)(knex)
  await baseDown(campaign_stage_table)(knex)
  await baseDown(campaign_table)(knex)
}
