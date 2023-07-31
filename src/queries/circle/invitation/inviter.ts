import type { GQLInvitationResolvers } from 'definitions'

const resolver: GQLInvitationResolvers['inviter'] = async (
  { inviter },
  _,
  { dataSources: { atomService } }
) => (inviter ? atomService.userIdLoader.load(inviter) : null)

export default resolver
