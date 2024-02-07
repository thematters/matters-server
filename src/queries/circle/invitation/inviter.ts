import type { GQLInvitationResolvers } from 'definitions'

const resolver: GQLInvitationResolvers['inviter'] = async (
  { inviter },
  _,
  { dataSources: { atomService } }
) => atomService.userIdLoader.load(inviter)
export default resolver
