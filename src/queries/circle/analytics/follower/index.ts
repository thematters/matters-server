import { GQLCircleFollowerAnalyticsTypeResolver } from 'definitions/schema'

import current from './current'
import followerPercentage from './followerPercentage'
import history from './history'

const resolvers: GQLCircleFollowerAnalyticsTypeResolver = {
  history,
  current,
  followerPercentage,
}

export default resolvers
