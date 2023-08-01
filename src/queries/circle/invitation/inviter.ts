import type { GQLInvitationResolvers } from 'definitions'

const resolver: GQLInvitationResolvers['inviter'] = async (
  { inviter },
  _,
  { dataSources: { userService } }
) => (inviter ? userService.loadById(inviter) : null)

export default resolver
