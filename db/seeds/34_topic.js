exports.seed = async (knex) => {
  // topics
  await knex('topic').del()
  await knex('topic').insert([
    {
      title: 'Topic 1',
      description: 'Topic 1 description',
      user_id: '1',
      cover: '1',
      public: true,
    },
    {
      title: 'Topic 2',
      description: 'Topic 2 description',
      user_id: '2',
      cover: '2',
      public: true,
    },
  ])

  // topic articles
  await knex('article_topic').del()
  await knex('article_topic').insert([
    {
      topic_id: '1',
      article_id: '1',
      order: 0,
    },
    {
      topic_id: '1',
      article_id: '2',
      order: 1,
    },
  ])

  // topic chapters
  await knex('chapter').del()
  await knex('chapter').insert([
    {
      title: 'Chapter 1',
      description: 'Chapter 1 description',
      topic_id: '1',
      order: 0,
    },
    {
      title: 'Chapter 2',
      description: 'Chapter 2 description',
      topic_id: '1',
      order: 1,
    },
    {
      title: 'Chapter 1',
      description: 'Chapter 1 description',
      topic_id: '2',
      order: 0,
    },
  ])

  // chapter articles
  await knex('article_chapter').del()
  await knex('article_chapter').insert([
    {
      chapter_id: '1',
      article_id: '1',
      order: 0,
    },
    {
      chapter_id: '1',
      article_id: '2',
      order: 1,
    },
  ])
}
