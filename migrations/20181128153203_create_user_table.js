exports.up = function(knex, Promise) {
  return knex.schema.createTable('user', function(t) {
    t.increments()
    t.string('username').notNullable().unique()
    t.string('email').notNullable().unique()
    t.string('mobile').notNullable()
    t.string('password').notNullable()
    t.string('avatar').notNullable()
    t.text('description')
    t.integer('read_speed').defaultTo(500)
    t.string('language').notNullable()
    t.specificType('thirdPartyAccounts', 'text ARRAY')
    // notification settings
    t.boolean('mention_notify').defaultTo(true)
    t.boolean('follow_notify').defaultTo(true)
    t.boolean('comment_notify').defaultTo(true)
    t.boolean('appreciation_notify').defaultTo(true)
    t.boolean('subscribe_notify').defaultTo(false)
    t.boolean('comment_subscribed_notify').defaultTo(false)
    t.boolean('downstream_notify').defaultTo(true)
    t.boolean('comment_pinned_notify').defaultTo(true)
    t.boolean('comment_voted_notify').defaultTo(false)
    t.boolean('wallet_update_notify').defaultTo(true)
    t.boolean('official_notice_notify').defaultTo(true)
    t.boolean('report_result_notify').defaultTo(true)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('user')
}
