import { CircleFollowerAnalyticsToHistoryResolver } from 'definitions'

const resolver: CircleFollowerAnalyticsToHistoryResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return [{ value: 0, date: new Date() }]
}

export default resolver
