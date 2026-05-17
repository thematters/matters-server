const table = 'community_watch_review_event'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })

  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.bigInteger('action_id').unsigned().notNullable()
    t.enu('event_type', [
      'appeal_received',
      'appeal_resolved',
      'review_upheld',
      'review_reversed',
      'reason_changed',
      'comment_restored',
      'content_cleared',
      'state_updated',
    ]).notNullable()
    t.bigInteger('actor_id').unsigned().notNullable()
    t.text('old_value')
    t.text('new_value')
    t.text('note')
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.foreign('action_id').references('id').inTable('community_watch_action')
    t.foreign('actor_id').references('id').inTable('user')
    t.index(['action_id', 'created_at'])
    t.index(['actor_id', 'created_at'])
    t.index(['event_type', 'created_at'])
  })
}

export const down = async (knex) => {
  await knex('entity_type').where({ table }).del()
  await knex.schema.dropTable(table)
}
