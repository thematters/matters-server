import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['readerCount'] = async (
  { id: articleId, authorId },
  _,
  { dataSources: { articleService }, viewer }
) => {
  if (viewer?.id !== authorId) {
    return 0
  }
  return articleService.countReaders(articleId)
}

export default resolver
