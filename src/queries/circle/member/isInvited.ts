import { MemberToIsInvitedResolver } from 'definitions'

const resolver: MemberToIsInvitedResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  // TODO: add circle invitaiton management
  return false
}

export default resolver
