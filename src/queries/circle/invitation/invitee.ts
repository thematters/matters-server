import type { GQLInvitationResolvers } from 'definitions'

import { ServerError } from 'common/errors'

const resolver: GQLInvitationResolvers['invitee'] = async (
  { email, userId },
  _,
  { dataSources: { userService } }
) => {
  if (email) {
    return { __type: 'Person', email }
  }

  if (!userId) {
    throw new ServerError('userId is missing')
  }

  const user = await userService.loadById(userId)
  if (user) {
    return { __type: 'User', ...user }
  }
  throw new ServerError('user not found')
}

export default resolver
