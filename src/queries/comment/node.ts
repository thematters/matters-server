import { ARTICLE_STATE, CIRCLE_STATE, COMMENT_TYPE } from 'common/enums'
import { CommentToNodeResolver } from 'definitions'

const resolver: CommentToNodeResolver = async (
  { targetId, targetTypeId, type },
  _,
  { dataSources: { atomService } }
) => {
  if (!targetId || !targetTypeId) {
    return
  }

  if (type === COMMENT_TYPE.article) {
    return atomService.findFirst({
      table: 'article',
      where: {
        id: targetId,
        state: ARTICLE_STATE.active,
      },
    })
  } else {
    return atomService.findFirst({
      table: 'circle',
      where: {
        id: targetId,
        state: CIRCLE_STATE.active,
      },
    })
  }
}

export default resolver
