import { CIRCLE_STATE } from 'common/enums/index.js'
import { connectionFromArray, fromConnectionArgs } from 'common/utils/index.js'
import { RecommendationToNewestCirclesResolver } from 'definitions'

const resolver: RecommendationToNewestCirclesResolver = async (
  { id },
  { input },
  { viewer, dataSources: { atomService }, knex }
) => {
  const { take, skip } = fromConnectionArgs(input)

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
