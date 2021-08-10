import { CircleSubscriberAnalyticsToCurrentSubscriberResolver } from 'definitions'

const resolver: CircleSubscriberAnalyticsToCurrentSubscriberResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return 0
}

export default resolver
