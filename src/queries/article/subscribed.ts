import { USER_ACTION } from 'common/enums'
import { ArticleToSubscribedResolver } from 'definitions'

const resolver: ArticleToSubscribedResolver = async (
  { articleId },
  _,
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    return false
  }

  const subscribedCount = await atomService.count({
    table: 'action_article',
    where: {
      userId: viewer.id,
      targetId: articleId,
      action: USER_ACTION.subscribe,
    },
  })

  return subscribedCount > 0
}

export default resolver
