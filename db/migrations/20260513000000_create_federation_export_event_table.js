const table = 'federation_export_event'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })

  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').unsigned().notNullable()
    t.bigInteger('actor_id').unsigned()
    t.string('trigger').notNullable()
    t.string('mode').notNullable().defaultTo('record_only')
    t.string('status').notNullable().defaultTo('recorded')
    t.boolean('eligible').notNullable()
    t.string('reason').notNullable()
    t.string('author_setting')
    t.string('article_setting')
    t.string('effective_article_setting').notNullable()
    t.jsonb('decision_report').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('article_id').references('id').inTable('article')
    t.foreign('actor_id').references('id').inTable('user')
    t.index(['article_id', 'created_at'])
    t.index(['trigger', 'mode', 'created_at'])
    t.index(['eligible', 'reason'])
  })
}

export const down = async (knex) => {
  await knex.schema.dropTable(table)
  await knex('entity_type').where({ table }).del()
}
