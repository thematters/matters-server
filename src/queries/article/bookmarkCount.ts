import type { GQLArticleResolvers } from '#definitions/index.js'

import { USER_ACTION } from '#common/enums/index.js'

const resolver: GQLArticleResolvers['bookmarkCount'] = async (
  { id: articleId },
  _,
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.hasRole('admin')) {
    return 0
  }
  const count = await atomService.count({
    table: 'action_article',
    where: {
      targetId: articleId,
      action: USER_ACTION.subscribe,
    },
  })
  return count
}

export default resolver
