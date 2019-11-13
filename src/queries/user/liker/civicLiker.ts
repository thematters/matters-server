import logger from 'common/logger'
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

  try {
    return await userService.likecoin.isCivicLiker({ liker })
  } catch (e) {
    logger.error(e)
    return false
  }
}

export default resolver
