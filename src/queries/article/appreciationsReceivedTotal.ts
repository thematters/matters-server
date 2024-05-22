import { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['appreciationsReceivedTotal'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.sumAppreciation(id)

export default resolver
