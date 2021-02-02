import { ARTICLE_STATE } from 'common/enums'
import { CommentToArticleResolver } from 'definitions'

const resolver: CommentToArticleResolver = async (
  { targetId, targetTypeId },
  _,
  { dataSources: { atomService } }
) => {
  if (!targetId || !targetTypeId) {
    return
  }

  const { table } = await atomService.findFirst({
    table: 'entity_type',
    where: { id: targetTypeId },
  })

  if (table !== 'article') {
    return
  }

  return atomService.findFirst({
    table: 'article',
    where: {
      id: targetId,
      state: ARTICLE_STATE.active,
    },
  })
}

export default resolver
