import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['readerCount'] = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => articleService.countReaders(articleId)

export default resolver
