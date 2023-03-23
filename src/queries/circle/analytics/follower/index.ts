import { GQLCircleFollowerAnalyticsTypeResolver } from 'definitions/schema.js'

import current from './current.js'
import followerPercentage from './followerPercentage.js'
import history from './history.js'

const resolvers: GQLCircleFollowerAnalyticsTypeResolver = {
  history,
  current,
  followerPercentage,
}

export default resolvers
