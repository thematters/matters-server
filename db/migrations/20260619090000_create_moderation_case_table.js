const caseTable = 'moderation_case'
const reporterTable = 'moderation_case_reporter'
const eventTable = 'moderation_event'

export const up = async (knex) => {
  await knex('entity_type').insert([
    { table: caseTable },
    { table: reporterTable },
    { table: eventTable },
  ])

  await knex.schema.createTable(caseTable, (t) => {
    t.bigIncrements('id').primary()
    t.enu('source', [
      'direct_report',
      'community_watch',
      'admin',
      'system',
      'model_assisted',
      'automated',
    ]).notNullable()
    t.enu('target_type', [
      'article',
      'comment',
      'moment',
      'user',
      'tag',
      'other',
    ]).notNullable()
    t.bigInteger('target_id').unsigned().notNullable()
    t.bigInteger('primary_reporter_id').unsigned()
    t.string('reason').notNullable()
    t.text('public_reason')
    t.enu('status', [
      'received',
      'reviewing',
      'action_taken',
      'rejected',
      'appealed',
      'resolved',
      'closed',
    ])
      .notNullable()
      .defaultTo('received')
    t.enu('outcome', [
      'no_action',
      'content_collapsed',
      'content_hidden',
      'content_removed',
      'account_limited',
      'restored',
      'partially_restored',
      'upheld',
    ])
    t.enu('automation_role', [
      'none',
      'suggested',
      'assisted',
      'automated',
    ])
      .notNullable()
      .defaultTo('none')
    t.string('model_name')
    t.string('model_version')
    t.enu('notice_state', [
      'not_required',
      'pending',
      'sent',
      'delayed',
      'prohibited',
      'failed',
    ])
      .notNullable()
      .defaultTo('not_required')
    t.timestamp('resolved_at')
    t.timestamp('closed_at')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('primary_reporter_id').references('id').inTable('user')
    t.index(['source', 'created_at'])
    t.index(['target_type', 'target_id'])
    t.index(['status', 'created_at'])
    t.index(['outcome', 'created_at'])
    t.index(['automation_role', 'created_at'])
    t.unique(['source', 'target_type', 'target_id', 'reason'])
  })

  await knex.schema.createTable(reporterTable, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('case_id').unsigned().notNullable()
    t.bigInteger('reporter_id').unsigned().notNullable()
    t.bigInteger('report_id').unsigned()
    t.timestamp('reported_at').defaultTo(knex.fn.now())

    t.foreign('case_id').references('id').inTable(caseTable).onDelete('CASCADE')
    t.foreign('reporter_id').references('id').inTable('user')
    t.foreign('report_id').references('id').inTable('report').onDelete('SET NULL')
    t.unique(['case_id', 'reporter_id'])
    t.index(['reporter_id', 'reported_at'])
    t.index(['report_id'])
  })

  await knex.schema.createTable(eventTable, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('case_id').unsigned().notNullable()
    t.enu('event_type', [
      'created',
      'notified',
      'reviewed',
      'actioned',
      'appealed',
      'restored',
      'closed',
      'exported',
    ]).notNullable()
    t.enu('actor_type', [
      'user',
      'community_watcher',
      'admin',
      'system',
      'model',
    ]).notNullable()
    t.bigInteger('actor_id').unsigned()
    t.text('public_reason')
    t.text('internal_note')
    t.string('from_status')
    t.string('to_status')
    t.string('from_outcome')
    t.string('to_outcome')
    t.jsonb('metadata')
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.foreign('case_id').references('id').inTable(caseTable).onDelete('CASCADE')
    t.foreign('actor_id').references('id').inTable('user')
    t.index(['case_id', 'created_at'])
    t.index(['event_type', 'created_at'])
    t.index(['actor_type', 'created_at'])
  })
}

export const down = async (knex) => {
  await knex.schema.dropTable(eventTable)
  await knex.schema.dropTable(reporterTable)
  await knex.schema.dropTable(caseTable)
  await knex('entity_type')
    .whereIn('table', [caseTable, reporterTable, eventTable])
    .del()
}
