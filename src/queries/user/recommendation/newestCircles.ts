import { CIRCLE_STATE } from 'common/enums'
import { connectionFromArray, cursorToIndex } from 'common/utils'
import { RecommendationToNewestCirclesResolver } from 'definitions'

const resolver: RecommendationToNewestCirclesResolver = async (
  { id },
  { input },
  { viewer, dataSources: { atomService }, knex }
) => {
  const { first: take, after } = input
  const skip = cursorToIndex(after) + 1

  const [totalCount, circles] = await Promise.all([
    atomService.count({
      table: 'circle',
      where: {
        state: CIRCLE_STATE.active,
      },
    }),
    atomService.findMany({
      table: 'circle',
      where: { state: CIRCLE_STATE.active },
      orderBy: [{ column: 'created_at', order: 'desc' }],
      skip,
      take,
    }),
  ])

  return connectionFromArray(circles, input, totalCount)
}

export default resolver
