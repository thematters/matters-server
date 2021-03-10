import { MemberToUserResolver } from 'definitions'

const resolver: MemberToUserResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => (id ? atomService.userIdLoader.load(id) : null)

export default resolver
