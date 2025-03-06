import type { GQLUserStatusResolvers } from 'definitions/index.js'

const resolver: GQLUserStatusResolvers['donatedArticleCount'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countDonatedArticle(id)

export default resolver
