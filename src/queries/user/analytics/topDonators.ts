import { connectionFromArray, connectionFromPromisedArray } from 'common/utils'
import { UserAnalyticsToTopDonatorsResolver } from 'definitions'

const resolver: UserAnalyticsToTopDonatorsResolver = async (
  { id },
  { input },
  { dataSources: { userService } },
  { cacheControl }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const connection = await connectionFromPromisedArray(
    userService.dataloader.loadMany([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
    ]),
    input,
    10
  )
  connection.edges = connection.edges.map((edge) => ({
    ...edge,
    donationCount: 1,
  }))
  return connection
}

export default resolver
