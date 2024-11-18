import type { GQLArticleResolvers } from 'definitions'

import { USER_ACTION } from 'common/enums'

const resolver: GQLArticleResolvers['bookmarked'] = async (
  { id: articleId },
  _,
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    return false
  }

  const bookmarkedCount = await atomService.count({
    table: 'action_article',
    where: {
      userId: viewer.id,
      targetId: articleId,
      action: USER_ACTION.subscribe,
    },
  })

  return bookmarkedCount > 0
}

export default resolver
