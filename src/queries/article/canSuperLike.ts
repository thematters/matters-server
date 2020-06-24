import { environment } from 'common/environment'
import { ArticleToCanSuperLikeResolver } from 'definitions'

const resolver: ArticleToCanSuperLikeResolver = async (
  article,
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

  return userService.likecoin.canSuperLike({
    liker,
    url: `${environment.siteDomain}/@${author.userName}/${article.slug}-${article.mediaHash}`,
    likerIp: viewer.ip,
  })
}

export default resolver
