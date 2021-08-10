import { CircleSubscriberAnalyticsToSubscriberHistoryResolver } from 'definitions'

const resolver: CircleSubscriberAnalyticsToSubscriberHistoryResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return [{ value: 0, date: new Date() }]
}

export default resolver
