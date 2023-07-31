import type { GQLLikerToResolvers } from 'definitions'

const resolver: GQLLikerToResolvers['tal'] = async (
  { id },
  _: any,
  { dataSources: { userService } }
) => {
  const liker = await userService.findLiker({ userId: id })

  if (!liker) {
    return 0
  }

  return userService.likecoin.total({ liker })
}

export default resolver
