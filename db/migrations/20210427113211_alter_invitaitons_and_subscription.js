const { alterEnumString } = require('../utils')

const coupon = 'circle_coupon'

const invitation = 'circle_invitation'

const subscription = 'circle_subscription'

const subscription_item = 'circle_subscription_item'

const temp_migration = 'temp_migration_data'

const durations = [1, 3, 6, 12]

exports.up = async (knex) => {
  // alter circle invitation
  await knex.schema.table(invitation, (t) => {
    t.bigInteger('coupon_id').nullable().alter()
    t.integer('duration_in_days')
    t.bigInteger('subscription_item_id').unsigned()

    // reference
    t.foreign('subscription_item_id')
      .references('id')
      .inTable(subscription_item)
  })

  const items = await knex
    .select('circle_invitation.id', 'circle_coupon.duration_in_months')
    .from(invitation)
    .join(coupon, 'circle_invitation.coupon_id', '=', 'circle_coupon.id')

  for (const item of items) {
    if (
      !item ||
      !item.duration_in_months ||
      !durations.includes(item.duration_in_months)
    ) {
      continue
    }
    await knex(invitation)
      .where({ id: item.id })
      .update({ duration_in_days: item.duration_in_months * 30 })
  }

  await knex.schema.table(invitation, (t) => {
    t.integer('duration_in_days').notNullable().alter()
  })

  // alter circle subscription provider
  await knex.raw(
    alterEnumString(subscription, 'provider', ['matters', 'stripe'])
  )

  // alter circle subscription item provider
  await knex.schema.table(subscription_item, (t) => {
    t.text('remark')
  })
  await knex.raw(
    alterEnumString(subscription_item, 'provider', ['matters', 'stripe'])
  )

  // create temp migration table
  await knex.schema.createTable(temp_migration, (t) => {
    t.bigIncrements('id').primary()
    t.string('subscription').nullable()
    t.string('item').nullable()
    t.boolean('archived').notNullable.defaultTo(false)
  })
}

exports.down = async (knex) => {
  // revert circle invitation
  await knex.schema.table(invitation, (t) => {
    t.bigInteger('coupon_id').notNullable().alter()
    t.dropColumn('duration_in_days')
    t.dropColumn('subscription_item_id')
  })

  // revert circle subscription
  await knex.raw(alterEnumString(subscription, 'provider', ['stripe']))

  // revert circle subscription item
  await knex.schema.table(subscription_item, (t) => {
    t.dropColumn('remark')
  })
  await knex.raw(alterEnumString(subscription_item, 'provider', ['stripe']))

  // remove temp migration table
  await knex.schema.dropTableIfExists(temp_migration)
}
