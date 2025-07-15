const table = 'topic_channel'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.specificType('pinned_articles', 'bigint ARRAY')
    t.string('provider_id').nullable().alter()
    t.bigint('parent_id').nullable().references('id').inTable('topic_channel')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('pinned_articles')
    t.string('provider_id').notNullable().alter()
    t.dropColumn('parent_id')
  })
}
