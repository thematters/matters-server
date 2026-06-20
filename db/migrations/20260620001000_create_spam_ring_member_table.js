const table = 'spam_ring_member'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })

  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.bigInteger('ring_id').unsigned().notNullable()
    t.bigInteger('user_id').unsigned().notNullable()
    t.enu('status', ['pending', 'frozen', 'skipped', 'restored'])
      .notNullable()
      .defaultTo('pending')
    // 可逆性關鍵：unfreeze 只解除「本 ring 凍結造成的」封禁，不動其他原因已封的帳號
    t.boolean('banned_by_this_ring').notNullable().defaultTo(false)
    t.text('skip_reason')
    // 凍結當下捕捉的帳號狀態（稽核/還原參考）
    t.enu('pre_freeze_state', ['active', 'banned', 'archived', 'frozen'])
    t.jsonb('evidence').notNullable().defaultTo('{}')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('ring_id').references('id').inTable('spam_ring')
    t.foreign('user_id').references('id').inTable('user')
    t.unique(['ring_id', 'user_id'])
    t.index(['ring_id', 'status'])
    t.index(['user_id'])
  })
}

export const down = async (knex) => {
  await knex('entity_type').where({ table }).del()
  await knex.schema.dropTable(table)
}
