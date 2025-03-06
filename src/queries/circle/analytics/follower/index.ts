import type { GQLCircleFollowerAnalyticsResolvers } from '#definitions/schema.js'

import current from './current.js'
import followerPercentage from './followerPercentage.js'
import history from './history.js'

const resolvers: GQLCircleFollowerAnalyticsResolvers = {
  history,
  current,
  followerPercentage,
}

export default resolvers
