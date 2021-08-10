import { CircleFollowerAnalyticsToFollowerPercentageResolver } from 'definitions'

const resolver: CircleFollowerAnalyticsToFollowerPercentageResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return 0
}

export default resolver
