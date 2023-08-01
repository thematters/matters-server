import type { GQLArticleResolvers } from 'definitions'

import { PUBLISH_STATE } from 'common/enums'

const resolver: Exclude<
  GQLArticleResolvers['newestUnpublishedDraft'],
  undefined
> = async ({ articleId }, _, { dataSources: { atomService } }) => {
  const draft = await atomService.findFirst({
    table: 'draft',
    where: { articleId },
    whereIn: [
      'publish_state',
      [PUBLISH_STATE.unpublished, PUBLISH_STATE.pending, PUBLISH_STATE.error],
    ],
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })

  return draft
}

export default resolver
