import type { GQLCircleFollowerAnalyticsResolvers } from '#definitions/index.js'

import { CIRCLE_ACTION } from '#common/enums/index.js'

const resolver: GQLCircleFollowerAnalyticsResolvers['current'] = (
  { id },
  _,
  { dataSources: { atomService } }
) =>
  atomService.count({
    table: 'action_circle',
    where: { targetId: id, action: CIRCLE_ACTION.follow },
  })

export default resolver
