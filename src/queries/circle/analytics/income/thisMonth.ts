import { CircleIncomeAnalyticsToThisMonthResolver } from 'definitions'

const resolver: CircleIncomeAnalyticsToThisMonthResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return 0
}

export default resolver
