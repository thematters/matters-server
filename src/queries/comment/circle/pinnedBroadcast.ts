import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums/index.js'
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
    orderBy: [{ column: 'pinned_at', order: 'desc' }],
  })

export default resolver
