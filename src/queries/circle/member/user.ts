import type { GQLMemberResolvers } from 'definitions'

const resolver: GQLMemberResolvers['user'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => (id ? atomService.userIdLoader.load(id) : null)

export default resolver
