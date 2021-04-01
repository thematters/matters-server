import { InvitationToInviteeResolver } from 'definitions'

const resolver: InvitationToInviteeResolver = async (
  { email, userId },
  _,
  { dataSources: { atomService } }
) => {
  if (email) {
    return { __type: 'Person', email }
  }

  const user = await atomService.userIdLoader.load(userId)
  if (user) {
    return { __type: 'User', ...user }
  }

  return null
}

export default resolver
