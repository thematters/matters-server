import { likecoin } from 'connectors/index.js'
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

  return likecoin.isCivicLiker({ likerId: liker.likerId, userId: id })
}

export default resolver
