import { environment } from 'common/environment'
import logger from 'common/logger'
import { ArticleToCanSuperLikeResolver } from 'definitions'

const resolver: ArticleToCanSuperLikeResolver = async (
  { articleId },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    return false
  }

  const [author, liker] = await Promise.all([
    userService.baseFindById(viewer.id),
    userService.findLiker({ userId: viewer.id }),
  ])

  if (!liker) {
    return false
  }

  try {
    return await userService.likecoin.canSuperLike({
      liker,
      url: `https://${environment.siteDomain}/@${author.userName}/${articleId}`,
      likerIp: viewer.ip,
      userAgent: viewer.userAgent,
    })
  } catch (e) {
    logger.error(e)
    return false
  }
}

export default resolver
