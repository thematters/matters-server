import { PUBLISH_STATE } from 'common/enums'
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
      [PUBLISH_STATE.unpublished, PUBLISH_STATE.pending, PUBLISH_STATE.error],
    ],
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })

  return draft
}

export default resolver
