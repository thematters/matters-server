import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'
import { CircleToPinnedBroadcastResolver } from 'definitions'

const resolver: CircleToPinnedBroadcastResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) =>
  atomService.findMany({
    table: 'comment',
    where: {
      pinned: true,
      state: COMMENT_STATE.active,
      targetId: id,
      type: COMMENT_TYPE.circleBroadcast,
    },
    orderBy: [{ column: 'updated_at', order: 'desc' }],
  })

export default resolver
