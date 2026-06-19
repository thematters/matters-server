const table = 'spam_ring'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })

  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    // 模板/家族指紋：偵測 job 端的歸群 key，同一 ring 跨次匯入用它做 idempotent upsert
    t.text('fingerprint').notNullable().unique()
    t.enu('status', ['pending', 'frozen', 'dismissed', 'restored'])
      .notNullable()
      .defaultTo('pending')
    // app 層訊號摘要（nearDupRingSize/entityRingSize/botUsernameRatio/topEntity/sampleCodes/sampleBrands/contentModelMax）
    t.jsonb('signals').notNullable().defaultTo('{}')
    t.integer('n_articles').notNullable().defaultTo(0)
    t.integer('n_authors').notNullable().defaultTo(0)
    t.decimal('new_account_ratio', 5, 4)
    t.decimal('score', 8, 4)
    t.enu('severity', ['low', 'medium', 'high', 'critical'])
    t.timestamp('detected_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('first_seen_at')
    t.timestamp('last_seen_at')
    t.timestamp('frozen_at')
    t.bigInteger('frozen_by').unsigned()
    t.text('note')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('frozen_by').references('id').inTable('user')
    t.index(['status', 'score'])
    t.index(['status', 'detected_at'])
    t.index(['status', 'n_authors'])
    t.index(['detected_at'])
  })
}

export const down = async (knex) => {
  await knex('entity_type').where({ table }).del()
  await knex.schema.dropTable(table)
}
