import { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['appreciationsReceivedTotal'] = async (
  { articleId },
  _: any,
  { dataSources: { articleService } }
) => articleService.sumAppreciation(articleId)

export default resolver
