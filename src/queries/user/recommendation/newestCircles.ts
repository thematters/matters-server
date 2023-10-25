import type { GQLRecommendationResolvers } from 'definitions'

import { CIRCLE_STATE } from 'common/enums'
import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLRecommendationResolvers['newestCircles'] = async (
  _,
  { input },
  { dataSources: { atomService } }
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
