import { INVITATION_STATE } from 'common/enums/index.js'
import { connectionFromArray, fromConnectionArgs } from 'common/utils/index.js'
import { InvitesToPendingResolver } from 'definitions'

const resolver: InvitesToPendingResolver = async (
  { id, owner },
  { input },
  { dataSources: { atomService }, viewer }
) => {
  const isOwner = owner === viewer.id
  if (!isOwner) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, records] = await Promise.all([
    atomService.count({
      table: 'circle_invitation',
      where: { state: INVITATION_STATE.pending, circleId: id, inviter: owner },
    }),
    atomService.findMany({
      table: 'circle_invitation',
      where: { state: INVITATION_STATE.pending, circleId: id, inviter: owner },
      orderBy: [{ column: 'created_at', order: 'desc' }],
      skip,
      take,
    }),
  ])

  return connectionFromArray(records, input, totalCount)
}

export default resolver
