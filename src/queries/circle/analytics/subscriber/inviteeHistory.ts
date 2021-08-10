import { CircleSubscriberAnalyticsToInviteeHistoryResolver } from 'definitions'

const resolver: CircleSubscriberAnalyticsToInviteeHistoryResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return [{ value: 0, date: new Date() }]
}

export default resolver
