import { PUBLISH_STATE } from 'common/enums'
import { ArticleToLiveResolver } from 'definitions'

const resolver: ArticleToLiveResolver = async (
  { articleId },
  _,
  { dataSources: { atomService } }
) => {
  const drafts = await atomService.findMany({
    table: 'draft',
    where: {
      articleId,
      archived: true,
      publishState: PUBLISH_STATE.published,
    },
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })

  if (drafts.length <= 1) {
    return
  }
  return drafts[0].createdAt
}

export default resolver
