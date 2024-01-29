const { baseDown } = require('../utils')

const articleTable = 'article'
const articleContentTable = 'article_content'
const articleVersionTable = 'article_version'

exports.up = async (knex) => {
  // create new tables, add new columns to article table

  await knex('entity_type').insert({ table: articleContentTable })
  await knex.schema.createTable(articleContentTable, (t) => {
    t.bigIncrements('id').primary()
    t.text('content').notNullable()
    t.string('hash').notNullable().unique()
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.index('hash')
  })

  await knex('entity_type').insert({ table: articleVersionTable })
  await knex.schema.createTable(articleVersionTable, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').unsigned().notNullable()
    t.string('title').notNullable()
    t.bigInteger('cover').unsigned()
    t.string('summary').notNullable()
    t.boolean('summary_customized')
    t.bigInteger('content_id').unsigned().notNullable()
    t.bigInteger('content_md_id').unsigned().notNullable()
    t.specificType('tags', 'text ARRAY')
    t.specificType('connections', 'text ARRAY')
    t.integer('word_count').notNullable()
    t.string('data_hash')
    t.string('media_hash')
    t.string('language')
    t.bigInteger('circle_id').unsigned()
    t.enu('access', ['public', 'paywall']).notNullable()
    t.enu('license', [
      'cc_0',
      'cc_by_nc_nd_2',
      'cc_by_nc_nd_4',
      'arr',
    ]).notNullable()
    t.string('iscn_id')
    t.string('request_for_donation')
    t.string('reply_to_donator')
    t.boolean('can_comment').notNullable()
    t.boolean('sensitive_by_author').notNullable()
    t.text('description')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('cover').references('id').inTable('asset')
    t.foreign('article_id').references('id').inTable('article')
    t.foreign('circle_id').references('id').inTable('circle')

    t.index('article_id')
  })
  await knex.schema.alterTable(articleTable, (t) => {
    t.boolean('sensitive_by_admin').notNullable().defaultTo(false)
  })
}

exports.down = async (knex) => {
  await baseDown(articleVersionTable)(knex)
  await baseDown(articleContentTable)(knex)
  await knex.schema.alterTable(articleTable, (t) => {
    t.dropColumn('sensitive_by_admin')
  })
}
