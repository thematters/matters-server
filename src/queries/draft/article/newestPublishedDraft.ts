import { PUBLISH_STATE } from 'common/enums/index.js'
import { ArticleToNewestPublishedDraftResolver } from 'definitions'

const resolver: ArticleToNewestPublishedDraftResolver = async (
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
