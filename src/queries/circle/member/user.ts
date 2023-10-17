import type { GQLMemberResolvers } from 'definitions'

const resolver: GQLMemberResolvers['user'] = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.loadById(id)

export default resolver
