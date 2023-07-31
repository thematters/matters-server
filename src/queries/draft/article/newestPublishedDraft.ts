import type { GQLArticleResolvers } from 'definitions'

import { PUBLISH_STATE } from 'common/enums'

const resolver: GQLArticleResolvers['newestPublishedDraft'] = async (
  { articleId },
  _,
  { dataSources: { atomService } }
) => {
  const draft = await atomService.findFirst({
    table: 'draft',
    where: { articleId, publishState: PUBLISH_STATE.published },
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })

  return draft
}

export default resolver
