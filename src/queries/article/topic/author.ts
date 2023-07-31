import type { GQLTopicResolvers } from 'definitions'

const resolver: GQLTopicResolvers['author'] = (
  { userId },
  _,
  { dataSources: { userService } }
) => userService.loadById(userId)

export default resolver
