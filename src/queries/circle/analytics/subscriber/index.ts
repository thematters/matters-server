import { GQLCircleSubscriberAnalyticsTypeResolver } from 'definitions/schema'

import currentInvitee from './currentInvitee'
import currentSubscriber from './currentSubscriber'
import inviteeHistory from './inviteeHistory'
import subscriberHistory from './subscriberHistory'

const resolvers: GQLCircleSubscriberAnalyticsTypeResolver = {
  subscriberHistory,
  inviteeHistory,
  currentSubscriber,
  currentInvitee,
}

export default resolvers
