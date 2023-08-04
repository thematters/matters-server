import type { GQLCircleFollowerAnalyticsResolvers } from 'definitions'

import { CIRCLE_ACTION } from 'common/enums'

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
