const table = 'feature_flag'

export const seed = async (knex) => {
  await knex(table).del()
  await knex(table).insert([
    {
      name: 'add_credit',
      flag: 'on',
    },
    {
      name: 'circle_management',
      flag: 'on',
    },
    {
      name: 'circle_interact',
      flag: 'on',
    },
    {
      name: 'fingerprint',
      flag: 'on',
    },
    {
      name: 'payment',
      flag: 'on',
    },
    {
      name: 'payout',
      flag: 'on',
    },
    {
      name: 'verify_appreciate',
      flag: 'off',
    },
    {
      name: 'spam_detection',
      flag: 'off',
      value: 0.5,
    },
    {
      name: 'discovery_spam_filter',
      flag: 'on',
      value: 0.6,
    },
    {
      name: 'topic_channel_spam_filter',
      flag: 'on',
      value: 0.8,
    },
    {
      name: 'article_channel',
      flag: 'off',
      value: 0.5,
    },
    {
      name: 'hottest_moment_feed',
      flag: 'off',
    },
    {
      name: 'discovery_probation',
      flag: 'off',
    },
    {
      name: 'spam_ring_restriction',
      flag: 'off',
    },
    {
      name: 'moment_tag',
      flag: 'on',
    },
    {
      name: 'moment_tag_display',
      flag: 'on',
    },
  ])
}
