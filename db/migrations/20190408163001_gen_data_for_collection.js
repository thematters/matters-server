exports.up = async knex => {
  // Gather ids
  const data = await knex('article')
    .select('upstream_id')
    .whereNotNull('upstream_id')
    .groupBy('upstream_id')
    .orderBy('upstream_id')

  // Produce and insert collection data
  for (const item of data) {
    const articles = await knex('article')
      .where(item)
      .orderBy('created_at')

    const collections = articles.map((article, index) => ({
      entrance_id: item.upstream_id,
      article_id: article.id,
      order: index + 1
    }))

    const insertions = await knex.batchInsert('collection', collections, 30)
  }
}

exports.down = async knex => {
  await knex('collection').truncate()
}
