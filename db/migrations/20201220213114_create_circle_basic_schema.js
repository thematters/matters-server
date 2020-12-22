const { baseDown } = require('../utils')

exports.up = async (knex) => {
  // circle table
  let table = 'circle'
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('name').notNullable().unique()
    t.bigInteger('cover').unsigned()
    t.bigInteger('avatar').unsigned()
    t.enu('state', ['active', 'banned', 'archived'])
      .notNullable()
      .defaultTo('active')
    t.bigInteger('owner').unsigned().notNullable()
    t.string('display_name').notNullable()
    t.text('description')
    t.enu('provider', ['stripe']).notNullable().defaultTo('stripe')
    t.string('provider_product_id').notNullable().unique()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // foreign keys
    t.foreign('owner')
      .references('id')
      .inTable('user')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT')
    t.foreign('cover')
      .references('id')
      .inTable('asset')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT')
    t.foreign('avatar')
      .references('id')
      .inTable('asset')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT')
  })

  // table for actions on circle, e.g. follow
  table = 'action_circle'

  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.enu('action', ['follow']).defaultTo('follow')
    t.bigInteger('user_id').unsigned().notNullable()
    t.bigInteger('target_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // foreign keys
    t.foreign('user_id')
      .references('id')
      .inTable('user')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
    t.foreign('target_id')
      .references('id')
      .inTable('circle')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })

  // article_circle table
  table = 'circle_price'

  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()

    t.string('name').notNullable().unique()
    t.decimal('amount').notNullable()
    t.enu('state', ['active', 'banned', 'archived'])
      .notNullable()
      .defaultTo('active')
    t.enu('currency', ['HKD', 'LIKE']).notNullable().defaultTo('HKD')
    t.bigInteger('circle_id').unsigned().notNullable()

    t.enu('provider', ['stripe']).notNullable().defaultTo('stripe')
    t.string('provider_price_id').notNullable().unique()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // foreign keys
    t.foreign('circle_id')
      .references('id')
      .inTable('circle')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })

  // table for article - circle relationship
  table = 'article_circle'

  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').unsigned().notNullable()
    t.bigInteger('circle_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // foreign keys
    t.foreign('article_id')
      .references('id')
      .inTable('article')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
    t.foreign('circle_id')
      .references('id')
      .inTable('circle')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })

  // table for user - subscription relationship
  table = 'circle_subscription'

  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.enu('state', [
      'active',
      'past_due',
      'unpaid',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'trialing',
    ])
      .notNullable()
      .defaultTo('active')
    t.bigInteger('user_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.timestamp('canceled_at')
    t.enu('provider', ['stripe']).notNullable().defaultTo('stripe')
    t.string('provider_subscription_id').notNullable().unique()

    // foreign keys
    t.foreign('user_id')
      .references('id')
      .inTable('user')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })

  // table for subscription - price relationship
  table = 'circle_subscription_item'

  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.enu('state', ['active', 'archived'])
    t.bigInteger('user_id').unsigned().notNullable()
    t.bigInteger('subscription_id').unsigned().notNullable()
    t.bigInteger('price_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.enu('provider', ['stripe']).notNullable().defaultTo('stripe')
    t.string('provider_subscription_item_id').notNullable().unique()

    // foreign keys
    t.foreign('user_id')
      .references('id')
      .inTable('user')
      .onUpdate('CASCADE')
      .onDelete('SET NULL')
    t.foreign('subscription_id')
      .references('id')
      .inTable('circle_subscription')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
    t.foreign('price_id')
      .references('id')
      .inTable('circle_price')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })

  // update comment table to target circle or article
  // add columns
  table = 'comment'
  await knex.schema.table(table, (t) => {
    t.bigInteger('target_id').unsigned()
    t.bigInteger('target_type_id').unsigned()

    t.foreign('target_type_id')
      .references('id')
      .inTable('entity_type')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
  // migrate data
  await knex.raw(/*sql*/ `
    update comment
    set target_type_id = (
      select
        id
      from entity_type
      where "table"='article'),
      target_id = article_id
  `)
  // add constrains
  await knex.schema.alterTable(table, (t) => {
    t.bigInteger('target_id').notNullable().alter()
    t.bigInteger('target_type_id').notNullable().alter()
  })
}

exports.down = async (knex) => {
  await baseDown('circle_subscription_item')(knex)
  await baseDown('circle_subscription')(knex)
  await baseDown('article_circle')(knex)
  await baseDown('circle_price')(knex)
  await baseDown('action_circle')(knex)
  await baseDown('circle')(knex)

  await knex.schema.table('comment', function (t) {
    t.dropColumn('target_id')
    t.dropColumn('target_type_id')
  })
}
