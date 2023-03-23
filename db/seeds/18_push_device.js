const table = 'push_device'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          device_id: '124tgsfade21t4feasd',
          user_id: '1',
          provider: 'jpush',
          platform: 'ios',
          version: '1.0.0',
        },
        {
          device_id: 'bsefianfusanfaifad',
          user_id: '2',
          provider: 'fcm',
          platform: 'web',
          user_agent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.28 Safari/537.36',
        },
      ])
    })
}
