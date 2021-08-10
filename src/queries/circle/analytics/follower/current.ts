import { CircleFollowerAnalyticsToCurrentResolver } from 'definitions'

const resolver: CircleFollowerAnalyticsToCurrentResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  return 0
}

export default resolver
