const { baseDown } = require('../utils')

const circle_invitation = 'circle_invitation'
const circle_coupon = 'circle_coupon'

exports.up = async (knex) => {
  // add `state` column
  await knex.schema.table(circle_invitation, (t) => {
    t.enu('state', [
      'pending',
      'accepted',
      'transfer_succeeded',
      'transfer_failed',
    ]).defaultTo('pending')
    t.index('state')
  })

  // update `state` based on `accepted`
  await knex.raw(`
    UPDATE
      ${circle_invitation}
    SET
      state = CASE WHEN accepted = TRUE THEN
        'accepted'
      ELSE
        'pending'
      END
  `)

  // drop `accepted` & `coupon_id` columns
  await knex.schema.table(circle_invitation, (t) => {
    t.dropColumn('accepted')
    t.dropColumn('coupon_id')
  })

  // drop `circle_coupon` table
  await knex('entity_type').where({ table: circle_coupon }).del()
  await knex.schema.dropTable(circle_coupon)
}

exports.down = async (knex) => {
  // add back `circle_coupon` table
  await knex('entity_type').insert({ table: circle_coupon })
  await knex.schema.createTable(circle_coupon, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('circle_id').unsigned().notNullable()
    t.integer('duration_in_months').defaultTo(1)
    t.string('provider_coupon_id').notNullable().unique()

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // index
    t.index(['circle_id'])

    // reference
    t.foreign('circle_id').references('id').inTable('circle')
  })

  // add back `accepted` & `coupon_id` columns
  await knex.schema.table(circle_invitation, (t) => {
    t.boolean('accepted').defaultTo(false)
    t.bigInteger('coupon_id').unsigned()

    t.foreign('coupon_id').references('id').inTable('circle_coupon')
  })

  // remove `state` column
  await knex.schema.table(circle_invitation, (t) => {
    t.dropIndex('state')
    t.dropColumn('state')
  })
}
