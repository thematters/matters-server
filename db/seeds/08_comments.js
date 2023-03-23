const table = 'comment'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000011',
          author_id: 1,
          article_id: 1,
          quotation_start: 1,
          quotation_end: 10,
          quotation_content: 'some quotation',
          content: '<div>Test comment 1</div>',
          target_id: 1,
          target_type_id: 4,
        },
        {
          uuid: '00000000-0000-0000-0000-000000000012',
          author_id: 2,
          article_id: 2,
          content: '<div>Test comment 2</div>',
          target_id: 2,
          target_type_id: 4,
        },
        {
          uuid: '00000000-0000-0000-0000-000000000013',
          author_id: 3,
          article_id: 3,
          content: '<div>Test comment 3</div>',
          target_id: 3,
          target_type_id: 4,
        },
        {
          uuid: '00000000-0000-0000-0000-000000000014',
          parent_comment_id: 1,
          author_id: 1,
          article_id: 3,
          pinned: true,
          content: '<div>Test comment 4</div>',
          target_id: 3,
          target_type_id: 4,
        },
        {
          uuid: '00000000-0000-0000-0000-000000000015',
          parent_comment_id: 1,
          author_id: 2,
          article_id: 1,
          content: '<div>Test comment 4</div>',
          reply_to: 1,
          target_id: 1,
          target_type_id: 4,
        },
        {
          uuid: '00000000-0000-0000-0000-000000000016',
          author_id: 2,
          article_id: 5,
          content: '<div>Test comment 4</div>',
          target_id: 5,
          target_type_id: 4,
        },
      ])
    })
}
