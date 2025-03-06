import { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['appreciationsReceivedTotal'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.sumAppreciation(id)

export default resolver
