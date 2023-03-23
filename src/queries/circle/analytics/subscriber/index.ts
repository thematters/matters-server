import { GQLCircleSubscriberAnalyticsTypeResolver } from 'definitions/schema.js'

import currentInvitee from './currentInvitee.js'
import currentSubscriber from './currentSubscriber.js'
import inviteeHistory from './inviteeHistory.js'
import subscriberHistory from './subscriberHistory.js'

const resolvers: GQLCircleSubscriberAnalyticsTypeResolver = {
  subscriberHistory,
  inviteeHistory,
  currentSubscriber,
  currentInvitee,
}

export default resolvers
