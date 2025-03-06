import type { GQLInvitationResolvers } from 'definitions/index.js'

import { ServerError } from 'common/errors.js'

const resolver: GQLInvitationResolvers['invitee'] = async (
  { email, userId },
  _,
  { dataSources: { atomService } }
) => {
  if (email) {
    return { __type: 'Person', email }
  }

  if (!userId) {
    throw new ServerError('userId is missing')
  }

  const user = await atomService.userIdLoader.load(userId)
  if (user) {
    return { __type: 'User', ...user }
  }
  throw new ServerError('user not found')
}

export default resolver
