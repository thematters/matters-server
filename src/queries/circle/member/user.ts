import type { GQLMemberResolvers } from 'definitions'

const resolver: GQLMemberResolvers['user'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => atomService.userIdLoader.load(id)

export default resolver
