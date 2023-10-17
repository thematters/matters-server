import type { GQLArticleResolvers } from 'definitions'

import { PUBLISH_STATE } from 'common/enums'

const resolver: GQLArticleResolvers['revisedAt'] = async (
  { articleId },
  _,
  { dataSources: { atomService } }
) => {
  const drafts = await atomService.findMany({
    table: 'draft',
    select: ['created_at'],
    where: {
      articleId,
      archived: true,
      publishState: PUBLISH_STATE.published,
    },
    orderBy: [{ column: 'created_at', order: 'desc' }],
    take: 2,
  })

  if (drafts.length <= 1) {
    return
  }

  return drafts[0].createdAt
}

export default resolver
