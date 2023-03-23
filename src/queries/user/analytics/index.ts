import { GQLUserAnalyticsTypeResolver } from 'definitions'

import topDonators from './topDonators.js'

const UserAnalytics: GQLUserAnalyticsTypeResolver = {
  topDonators,
}

export default UserAnalytics
