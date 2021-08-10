import { CircleSubscriberAnalyticsToCurrentInviteeResolver } from 'definitions'

const resolver: CircleSubscriberAnalyticsToCurrentInviteeResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return 0
}

export default resolver
