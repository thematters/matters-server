const Knex = require('knex')
const knexConfig = require('../knexfile')

beforeAll(async () => {
  const knex = Knex(knexConfig.test)
  const tables = [
    'public.user',
    'verification_code',
    'seeding_user',
    'draft',
    'feature_flag',
    'tag_boost',
    'asset',
    'action_comment',
    'article',
    'article_read',
    'matters_choice',
    'oauth_client',
    'comment',
    'asset_map',
    'tag',
    'user_oauth',
    'user_oauth_likecoin',
    'invitation',
    'user_badge',
    'customer',
    'appreciation',
    'user_boost',
    'article_boost',
    'article_tag',
    'matters_today',
    'push_device',
    'user_notify_setting',
    'audio_draft',
    'comment_mentioned_user',
    'action_user',
    'action_article',
    'notice',
    'notice_detail',
    'notice_actor',
    'notice_entity',
    'feedback',
    'feedback_asset',
    'report',
    'report_asset'
  ]
  await knex.raw(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE;`)
  await knex.seed.run()
})
