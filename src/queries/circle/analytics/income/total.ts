import { CircleIncomeAnalyticsToTotalResolver } from 'definitions'

const resolver: CircleIncomeAnalyticsToTotalResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return 0
}

export default resolver
