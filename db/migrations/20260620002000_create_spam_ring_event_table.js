const table = 'spam_ring_event'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })

  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.bigInteger('ring_id').unsigned().notNullable()
    t.bigInteger('member_id').unsigned()
    // nullable：機器偵測（detected）事件無管理員，actor_id 留空
    t.bigInteger('actor_id').unsigned()
    t.enu('action', [
      'detected',
      'frozen',
      'unfrozen',
      'dismissed',
      'member_banned',
      'member_skipped',
      'member_restored',
    ]).notNullable()
    t.jsonb('detail').notNullable().defaultTo('{}')
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.foreign('ring_id').references('id').inTable('spam_ring')
    t.foreign('member_id').references('id').inTable('spam_ring_member')
    t.foreign('actor_id').references('id').inTable('user')
    t.index(['ring_id', 'created_at'])
    t.index(['actor_id', 'created_at'])
    t.index(['action', 'created_at'])
  })
}

export const down = async (knex) => {
  await knex('entity_type').where({ table }).del()
  await knex.schema.dropTable(table)
}
