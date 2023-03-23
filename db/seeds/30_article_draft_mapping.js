// to migrate parts of article to draft

const article = 'article'
const draft = 'draft'

export const seed = async (knex) => {
  const articles = await knex(article).select()
  await Promise.all(
    articles.map(async (article) => {
      return knex(draft).where({ id: article.draft_id }).update({
        article_id: article.id,
        data_hash: article.data_hash,
        media_hash: article.media_hash,
        word_count: article.word_count,
      })
    })
  )
}
