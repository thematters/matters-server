import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['readerCount'] = async (
  { articleId, authorId },
  _,
  { dataSources: { articleService }, viewer }
) => {
  if (viewer?.id !== authorId) {
    return 0
  }
  return articleService.countReaders(articleId)
}

export default resolver
