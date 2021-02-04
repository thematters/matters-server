import { ARTICLE_STATE, COMMENT_TYPE } from 'common/enums'
import { CommentToArticleResolver } from 'definitions'

const resolver: CommentToArticleResolver = async (
  { targetId, targetTypeId, type },
  _,
  { dataSources: { atomService } }
) => {
  if (!targetId || !targetTypeId) {
    return
  }

  if (type !== COMMENT_TYPE.article) {
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
