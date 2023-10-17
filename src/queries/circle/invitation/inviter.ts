import type { GQLInvitationResolvers } from 'definitions'

const resolver: GQLInvitationResolvers['inviter'] = async (
  { inviter },
  _,
  { dataSources: { userService } }
) => userService.loadById(inviter)
export default resolver
