import { CIRCLE_ACTION } from 'common/enums'
import { CircleToIsMemberResolver } from 'definitions'

const resolver: CircleToIsMemberResolver = async (
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
      action: CIRCLE_ACTION.join,
      targetId: id,
      userId: viewer.id,
    },
  })
  return !!record
}

export default resolver
