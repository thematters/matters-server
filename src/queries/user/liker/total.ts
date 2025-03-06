import type { GQLLikerResolvers } from 'definitions/index.js'

const resolver: GQLLikerResolvers['total'] = async (
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
