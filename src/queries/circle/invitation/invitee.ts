import { InvitationToInviteeResolver } from 'definitions'

const resolver: InvitationToInviteeResolver = async (
  { email, user_id },
  _,
  { dataSources: { atomService } }
) => {
  if (email) {
    return { __type: 'Person', email }
  }

  const user = await atomService.userIdLoader.load(user_id)
  if (user) {
    return { __type: 'User', ...user }
  }

  return null
}

export default resolver
