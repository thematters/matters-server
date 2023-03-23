const table = 'draft'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          author_id: '1',
          title: 'test draft 1',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>',
          publish_state: 'unpublished',
          tags: ['tag1', 'tag2'],
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          author_id: '2',
          title: 'test draft 2',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>',
          publish_state: 'published',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          author_id: '3',
          title: 'test draft 3',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>',
          publish_state: 'published',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          author_id: '1',
          title: 'test draft 4',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>',
          publish_state: 'published',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000005',
          author_id: '7',
          title: 'test draft 5',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>',
          publish_state: 'published',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000006',
          author_id: 1,
          title: 'test draft 6',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>',
          publish_state: 'published',
        },
      ])
    })
}
