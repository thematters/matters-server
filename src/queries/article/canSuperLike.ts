import type { GQLArticleResolvers } from 'definitions'

import { environment } from 'common/environment'
import { getLogger } from 'common/logger'

const logger = getLogger('mutation-superlike')

const resolver: GQLArticleResolvers['canSuperLike'] = async (
  { id },
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
      url: `https://${environment.siteDomain}/@${author.userName}/${id}`,
      likerIp: viewer.ip,
      userAgent: viewer.userAgent,
    })
  } catch (e) {
    logger.error(e)
    return false
  }
}

export default resolver
