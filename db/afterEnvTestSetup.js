const Knex = require('knex')
const knexConfig = require('../knexfile')

const knex = Knex(knexConfig.test)

beforeAll(async () => {
  const { count } = await knex('public.user').count().first()
  if (count === '0') {
    await knex.seed.run()
  }
})

afterAll(async () => {
  // const getTables = async (knex) => {
  //   const res = await knex.raw(
  //     "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  //   )
  //   const tables = res.rows.map(({ table_name }) => table_name)
  //   const dataTables = tables.filter(
  //     (t) => !t.includes('knex') && t !== 'entity_type'
  //   )
  //   return dataTables.map((t) => 'public.' + t)
  // }
  // const tables = await getTables(knex)
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
    'report_asset',
  ]
  await knex.raw(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE;`)
})
