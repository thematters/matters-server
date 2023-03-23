const table_article = 'article'
const table_collection = 'collection'
const table_draft = 'draft'
const table_comment = 'comment'
const table_user = 'user'
const table_notice = 'notice'
const table_action_article = 'action_article'
const table_action_comment = 'action_comment'
const table_action_user = 'action_user'
const table_log_record = 'log_record'

export const up = async (knex) => {
  // article
  await knex.schema.table(table_article, (t) => {
    t.index('state').index('created_at').index('author_id')
  })

  // collection
  await knex.schema.table(table_collection, (t) => {
    t.index('entrance_id').index('article_id').index('order')
  })

  // draft
  await knex.schema.table(table_draft, (t) => {
    t.index('publish_state').index(['author_id', 'archived']).index('archived')
  })

  // comment
  await knex.schema.table(table_comment, (t) => {
    t.index(['parent_comment_id', 'state']).index('state')
  })

  // user
  await knex.schema.table(table_user, (t) => {
    t.index('state')
  })

  // notice
  await knex.schema.table(table_notice, (t) => {
    t.index(['recipient_id', 'deleted', 'unread'])
  })

  // action_*
  await knex.schema.table(table_action_article, (t) => {
    t.index(['target_id', 'action'])
      .index(['user_id', 'action'])
      .index('action')
  })
  await knex.schema.table(table_action_comment, (t) => {
    t.index(['target_id', 'action'])
      .index(['user_id', 'action'])
      .index('action')
  })
  await knex.schema.table(table_action_user, (t) => {
    t.index(['target_id', 'action'])
      .index(['user_id', 'action'])
      .index('action')
  })

  // log_record
  await knex.schema.table(table_log_record, (t) => {
    t.index(['user_id', 'type'])
  })
}

export const down = async (knex) => {
  // article
  await knex.schema.table(table_article, (t) => {
    t.dropIndex('state').dropIndex('created_at').dropIndex('author_id')
  })

  // collection
  await knex.schema.table(table_collection, (t) => {
    t.dropIndex('entrance_id').dropIndex('article_id').dropIndex('order')
  })

  // draft
  await knex.schema.table(table_draft, (t) => {
    t.dropIndex('publish_state')
      .dropIndex(['author_id', 'archived'])
      .dropIndex('archived')
  })

  // comment
  await knex.schema.table(table_comment, (t) => {
    t.dropIndex(['parent_comment_id', 'state']).dropIndex('state')
  })

  // user
  await knex.schema.table(table_user, (t) => {
    t.dropIndex('state')
  })

  // notice
  await knex.schema.table(table_notice, (t) => {
    t.dropIndex(['recipient_id', 'deleted', 'unread'])
  })

  // action_*
  await knex.schema.table(table_action_article, (t) => {
    t.dropIndex(['target_id', 'action'])
      .dropIndex(['user_id', 'action'])
      .dropIndex('action')
  })
  await knex.schema.table(table_action_comment, (t) => {
    t.dropIndex(['target_id', 'action'])
      .dropIndex(['user_id', 'action'])
      .dropIndex('action')
  })
  await knex.schema.table(table_action_user, (t) => {
    t.dropIndex(['target_id', 'action'])
      .dropIndex(['user_id', 'action'])
      .dropIndex('action')
  })

  // log_record
  await knex.schema.table(table_log_record, (t) => {
    t.dropIndex(['user_id', 'type'])
  })
}
