import type { GQLTopicResolvers } from 'definitions'

const resolver: GQLTopicResolvers['author'] = (
  { userId },
  _,
  { dataSources: { atomService } }
) => atomService.userIdLoader.load(userId)

export default resolver
