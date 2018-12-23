const table = 'article'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          author_id: 1,
          draft_id: 1,
          title: 'test article 1',
          summary: 'Some text',
          word_count: '1000',
          hash: 'some-ipfs-hash',
          content: '<div>some html string</div>',
          publish_state: 'published'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          author_id: 2,
          draft_id: 2,
          upstream_id: 1,
          title: 'test article 2',
          summary: 'Some text',
          word_count: '1000',
          hash: 'some-ipfs-hash',
          content: '<div>some html string</div>',
          publish_state: 'published'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          author_id: 3,
          draft_id: 3,
          upstream_id: 2,
          title: 'test article 3',
          summary: 'Some text',
          word_count: '1000',
          hash: 'some-ipfs-hash',
          content: '<div>some html string</div>',
          publish_state: 'published'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          author_id: 1,
          upstream_id: 2,
          title: 'test article 4',
          summary: 'Some text',
          word_count: '1000',
          hash: 'some-ipfs-hash',
          content: '<div>some html string</div>',
          publish_state: 'published'
        }
      ])
    })
}
