import { GQLUserAnalyticsResolvers } from '#definitions/index.js'

import topDonators from './topDonators.js'

const UserAnalytics: GQLUserAnalyticsResolvers = {
  topDonators,
}

export default UserAnalytics
