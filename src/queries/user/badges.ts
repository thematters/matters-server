import { GQLUserInfoResolvers } from 'definitions'

const resolver: GQLUserInfoResolvers['badges'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  if (id === undefined) {
    return []
  }

  return atomService.findMany({ table: 'user_badge', where: { userId: id } })
}

export default resolver
