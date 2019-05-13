import { UserStatusToUnreadFolloweeArticlesResolver } from 'definitions'

const resolver: UserStatusToUnreadFolloweeArticlesResolver = async (
  { id },
  _,
  { dataSources: { systemService, userService } }
) => {
  const readFolloweeArticlesLog = await systemService.findLogRecord({
    userId: id,
    type: 'read_followee_articles'
  })
  const [latestFolloweeArticle] = await userService.followeeArticles({
    userId: id,
    offset: 0,
    limit: 1
  })

  if (!readFolloweeArticlesLog || !latestFolloweeArticle) {
    return false
  }

  return readFolloweeArticlesLog.readAt < latestFolloweeArticle.createdAt
}

export default resolver
