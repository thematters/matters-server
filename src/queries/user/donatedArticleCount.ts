import type { GQLUserStatusResolvers } from 'definitions'

const resolver: GQLUserStatusResolvers['donatedArticleCount'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countDonatedArticle(id)

export default resolver
