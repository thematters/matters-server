const table = 'article'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          author_id: 1,
          draft_id: 1,
          title: 'test article 1',
          slug: 'test-article-1',
          summary: 'Some text',
          word_count: '1000',
          data_hash: 'someIpfsDataHash1',
          media_hash: 'someIpfsMediaHash1',
          content: '<div>some html string</div>',
          state: 'active',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          author_id: 2,
          draft_id: 2,
          title: 'test article 2',
          slug: 'test-article-2',
          summary: 'Some text',
          word_count: '1000',
          data_hash: 'someIpfsDataHash2',
          media_hash: 'someIpfsMediaHash2',
          content: '<div>some html string</div>',
          state: 'active',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          author_id: 3,
          draft_id: 3,
          title: 'test article 3',
          slug: 'test-article-3',
          summary: 'Some text',
          word_count: '1000',
          data_hash: 'someIpfsMediaHash3',
          media_hash: 'someIpfsMediaHash3',
          content: '<div>some html string</div>',
          state: 'active',
          public: true,
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          author_id: 1,
          draft_id: 4,
          title: 'test article 4',
          slug: 'test-article-4',
          summary: 'Some text',
          word_count: '1000',
          data_hash: 'someIpfsMediaHash4',
          media_hash: 'someIpfsMediaHash4',
          content: '<div>some html string</div>',
          state: 'active',
          public: true,
        },
        {
          uuid: '00000000-0000-0000-0000-000000000005',
          author_id: 7,
          draft_id: 5,
          title: 'test article 5 onboarding user',
          slug: 'test-article-5-onboarding-user',
          summary: 'Some text',
          word_count: '1000',
          data_hash: 'someIpfsMediaHash5',
          media_hash: 'someIpfsMediaHash5',
          content: '<div>some html string</div>',
          state: 'active',
          public: true,
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          author_id: 1,
          draft_id: 6,
          title: 'test article 6',
          slug: 'test-article-6',
          summary: 'Some text',
          word_count: 1000,
          data_hash: 'someIpfsMediaHash4',
          media_hash: 'someIpfsMediaHash4',
          content: '<div>some html string</div>',
          state: 'active',
          public: true,
        },
      ])
    })
}
