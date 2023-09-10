import type { GQLLikerResolvers } from 'definitions'

const resolver: GQLLikerResolvers['civicLiker'] = async (
  { id },
  _,
  { dataSources: { userService, likecoin } }
) => {
  const liker = await userService.findLiker({ userId: id })

  if (!liker) {
    return false
  }

  return likecoin.isCivicLiker({
    likerId: liker.likerId,
    userId: id,
  })
}

export default resolver
