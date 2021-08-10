import { CircleIncomeAnalyticsToLastMonthResolver } from 'definitions'

const resolver: CircleIncomeAnalyticsToLastMonthResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return 0
}

export default resolver
