import { INVITATION_STATE } from 'common/enums'
import { connectionFromArray, cursorToIndex } from 'common/utils'
import { CircleToInvitationsResolver } from 'definitions'

const resolver: CircleToInvitationsResolver = async (
  { id, owner },
  { input },
  { dataSources: { atomService }, viewer }
) => {
  const isOwner = owner === viewer.id
  if (!isOwner) {
    return connectionFromArray([], input)
  }

  const { first: take, after } = input
  const skip = cursorToIndex(after) + 1

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
