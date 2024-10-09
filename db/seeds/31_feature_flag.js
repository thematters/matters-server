const table = 'feature_flag'

exports.seed = async (knex) => {
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
      name: 'filter_inappropriate_content_in_latest_feed',
      flag: 'off',
    },
  ])
}
