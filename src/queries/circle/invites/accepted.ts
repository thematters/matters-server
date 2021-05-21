import { INVITATION_STATE } from 'common/enums'
import { connectionFromArray, cursorToIndex } from 'common/utils'
import { InvitesToAcceptedResolver } from 'definitions'

const resolver: InvitesToAcceptedResolver = async (
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
  const states = Object.values(INVITATION_STATE).filter(
    (state) => state !== INVITATION_STATE.pending
  )

  const [totalCount, records] = await Promise.all([
    atomService.count({
      table: 'circle_invitation',
      where: { circleId: id, inviter: owner },
      whereIn: ['state', states],
    }),
    atomService.findMany({
      table: 'circle_invitation',
      where: { circleId: id, inviter: owner },
      whereIn: ['state', states],
      orderBy: [{ column: 'accepted_at', order: 'desc' }],
      skip,
      take,
    }),
  ])

  return connectionFromArray(records, input, totalCount)
}

export default resolver
