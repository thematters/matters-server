import type { GQLTopicResolvers } from 'definitions'

const resolver: GQLTopicResolvers['latestArticle'] = async (
  { id: topicId },
  _,
  { dataSources: { draftService }, knex }
) => {
  const latestArticle = await knex
    .select('article.*')
    .from(
      knex
        .select()
        .union([
          knex('article_topic')
            .select('article_id')
            .where({ topic_id: topicId }),
          knex('article_chapter')
            .select('article_id')
            .leftJoin('chapter', 'chapter.id', 'article_chapter.chapter_id')
            .where({ 'chapter.topic_id': topicId }),
        ])
        .as('topic_articles')
    )
    .leftJoin('article', 'article.id', 'topic_articles.article_id')
    .orderBy([{ column: 'created_at', order: 'desc' }])
    .first()

  if (!latestArticle) {
    return
  }

  return draftService.dataloader.load(latestArticle.draftId)
}

export default resolver
