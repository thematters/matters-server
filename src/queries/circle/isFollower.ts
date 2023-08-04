import type { GQLCircleResolvers } from 'definitions'

import { CIRCLE_ACTION } from 'common/enums'

const resolver: GQLCircleResolvers['isFollower'] = async (
  { id },
  _,
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    return false
  }

  const record = await atomService.findFirst({
    table: 'action_circle',
    where: {
      action: CIRCLE_ACTION.follow,
      targetId: id,
      userId: viewer.id,
    },
  })
  return !!record
}

export default resolver
