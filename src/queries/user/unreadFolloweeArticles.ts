import { UserStatusToUnreadFolloweeArticlesResolver } from 'definitions'
import { LOG_RECORD_TYPES } from 'common/enums'

const resolver: UserStatusToUnreadFolloweeArticlesResolver = async (
  { id },
  _,
  { dataSources: { systemService, userService } }
) => {
  const readFolloweeArticlesLog = await systemService.findLogRecord({
    userId: id,
    type: LOG_RECORD_TYPES.ReadFolloweeArticles
  })
  const [latestFolloweeArticle] = await userService.followeeArticles({
    userId: id,
    offset: 0,
    limit: 1
  })

  if (!readFolloweeArticlesLog || !latestFolloweeArticle) {
    return true
  }

  return readFolloweeArticlesLog.readAt < latestFolloweeArticle.createdAt
}

export default resolver
