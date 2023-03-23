import { PUBLISH_STATE } from 'common/enums/index.js'
import { ArticleToNewestUnpublishedDraftResolver } from 'definitions'

const resolver: ArticleToNewestUnpublishedDraftResolver = async (
  { articleId },
  _,
  { dataSources: { atomService } }
) => {
  const draft = await atomService.findFirst({
    table: 'draft',
    where: { articleId },
    whereIn: [
      'publish_state',
      [PUBLISH_STATE.unpublished, PUBLISH_STATE.pending],
    ],
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })

  return draft
}

export default resolver
