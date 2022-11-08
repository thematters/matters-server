import { CACHE_PREFIX, CACHE_TTL } from 'common/enums'
import { CacheService } from 'connectors'
import { likeCoinQueue } from 'connectors/queue'
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

  const cacheService = new CacheService(CACHE_PREFIX.CIVIC_LIKER)

  const civicLiker = await cacheService.getObject({
    keys: { id: liker.likerId },
    getter: async () => {
      // insert a placeholder
      cacheService.storeObject({
        keys: { id: liker.likerId },
        data: false,
        expire: CACHE_TTL.LONG,
      })

      // trigger queue to check if liker is a civic liker
      likeCoinQueue.getCivicLiker({ userId: id, likerId: liker.likerId })

      return false
    },
    expire: CACHE_TTL.LONG,
  })

  return civicLiker
}

export default resolver
