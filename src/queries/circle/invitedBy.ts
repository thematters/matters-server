import { CircleToInvitedByResolver } from 'definitions'

const resolver: CircleToInvitedByResolver = async (
  { id },
  _,
  { dataSources: { atomService }, viewer }
) => {
  if (!viewer.id) {
    return null
  }

  const invitation = await atomService.findFirst({
    table: 'circle_invitation',
    where: { circleId: id, userId: viewer.id },
  })

  return invitation
}

export default resolver
