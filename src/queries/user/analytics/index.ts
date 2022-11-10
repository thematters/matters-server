import { GQLUserAnalyticsTypeResolver } from 'definitions'

import topDonators from './topDonators'

const UserAnalytics: GQLUserAnalyticsTypeResolver = {
  topDonators,
}

export default UserAnalytics
