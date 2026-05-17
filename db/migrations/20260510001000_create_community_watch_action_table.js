const table = 'community_watch_action'
const activeCommentIndex = 'community_watch_action_comment_id_active_unique'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })

  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.bigInteger('comment_id').unsigned().notNullable()
    t.enu('comment_type', ['article', 'moment']).notNullable()
    t.enu('target_type', ['article', 'moment']).notNullable()
    t.bigInteger('target_id').unsigned().notNullable()
    t.text('target_title')
    t.string('target_short_hash')
    t.enu('reason', ['porn_ad', 'spam_ad']).notNullable()
    t.bigInteger('actor_id').unsigned().notNullable()
    t.bigInteger('comment_author_id').unsigned()
    t.text('original_content')
    t.enu('original_state', [
      'active',
      'archived',
      'banned',
      'collapsed',
    ]).notNullable()
    t.enu('action_state', ['active', 'restored', 'voided'])
      .notNullable()
      .defaultTo('active')
    t.enu('appeal_state', ['none', 'received', 'resolved'])
      .notNullable()
      .defaultTo('none')
    t.enu('review_state', ['pending', 'upheld', 'reversed', 'reason_adjusted'])
      .notNullable()
      .defaultTo('pending')
    t.bigInteger('reviewer_id').unsigned()
    t.text('review_note')
    t.timestamp('reviewed_at')
    t.timestamp('content_expires_at').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('comment_id').references('id').inTable('comment')
    t.foreign('actor_id').references('id').inTable('user')
    t.foreign('comment_author_id').references('id').inTable('user')
    t.foreign('reviewer_id').references('id').inTable('user')
    t.index(['comment_id'])
    t.index(['created_at'])
    t.index(['actor_id', 'created_at'])
    t.index(['reason', 'created_at'])
    t.index(['review_state', 'created_at'])
    t.index(['content_expires_at'])
  })

  await knex.raw(`
    CREATE UNIQUE INDEX ${activeCommentIndex}
    ON ${table} (comment_id)
    WHERE action_state = 'active'
  `)
}

export const down = async (knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${activeCommentIndex}`)
  await knex('entity_type').where({ table }).del()
  await knex.schema.dropTable(table)
}
