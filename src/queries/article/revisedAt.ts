import { PUBLISH_STATE } from 'common/enums'
import { ArticleToRevisedAtResolver } from 'definitions'

const resolver: ArticleToRevisedAtResolver = async (
  { articleId },
  _,
  { dataSources: { atomService } }
) => {
  const draft = await atomService.findFirst({
    table: 'draft',
    select: ['created_at'],
    where: {
      articleId,
      archived: true,
      publishState: PUBLISH_STATE.published,
    },
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })

  if (!draft) {
    return
  }
  return draft.createdAt
}

export default resolver
