import { CircleIncomeAnalyticsToHistoryResolver } from 'definitions'

const resolver: CircleIncomeAnalyticsToHistoryResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return [{ value: 0, date: new Date() }]
}

export default resolver
