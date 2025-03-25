const table_article_tag = 'article_tag'
const table_notice = 'notice'
const table_notice_detail = 'notice_detail'
const table_notice_entity = 'notice_entity'
const table_notice_actor = 'notice_actor'

export const up = async (knex) => {
  // article_tag
  await knex.schema.table(table_article_tag, (t) => {
    t.index('article_id').index('tag_id')
  })

  // notice
  await knex.schema.table(table_notice, (t) => {
    t.index(['recipient_id', 'unread'])
      .index('notice_detail_id')
      .index('deleted')
      .index('unread')
  })

  // notice detail
  await knex.schema.table(table_notice_detail, (t) => {
    t.index('notice_type')
  })

  // notice entity
  await knex.schema.table(table_notice_entity, (t) => {
    t.index('entity_type_id').index('notice_id')
  })

  // notice actor
  await knex.schema.table(table_notice_actor, (t) => {
    t.index('notice_id')
  })
}

export const down = async (knex) => {
  // article_tag
  await knex.schema.table(table_article_tag, (t) => {
    t.dropIndex('article_id').dropIndex('tag_id')
  })

  // notice
  await knex.schema.table(table_notice, (t) => {
    t.dropIndex(['recipient_id', 'unread'])
      .dropIndex('notice_detail_id')
      .dropIndex('deleted')
      .dropIndex('unread')
  })

  // notice detail
  await knex.schema.table(table_notice_detail, (t) => {
    t.dropIndex('notice_type')
  })

  // notice entity
  await knex.schema.table(table_notice_entity, (t) => {
    t.dropIndex('entity_type_id').dropIndex('notice_id')
  })

  // notice actor
  await knex.schema.table(table_notice_actor, (t) => {
    t.dropIndex('notice_id')
  })
}
