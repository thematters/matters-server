import { LikerToCivicLikerResolver } from 'definitions'

const resolver: LikerToCivicLikerResolver = async (
  { id },
  _: any,
  { dataSources: { userService } }
) => {
  const liker = await userService.findLiker({ userId: id })

  if (!liker) {
    return false
  }

  return userService.likecoin.isCivicLiker({ liker })
}

export default resolver
