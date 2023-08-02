import type { GQLCircleFollowerAnalyticsResolvers } from 'definitions/schema'

import current from './current'
import followerPercentage from './followerPercentage'
import history from './history'

const resolvers: GQLCircleFollowerAnalyticsResolvers = {
  history,
  current,
  followerPercentage,
}

export default resolvers
