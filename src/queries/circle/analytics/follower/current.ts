import { CIRCLE_ACTION } from 'common/enums/index.js'
import { CircleFollowerAnalyticsToCurrentResolver } from 'definitions'

const resolver: CircleFollowerAnalyticsToCurrentResolver = (
  { id },
  _,
  { dataSources: { atomService } }
) =>
  atomService.count({
    table: 'action_circle',
    where: { targetId: id, action: CIRCLE_ACTION.follow },
  })

export default resolver
