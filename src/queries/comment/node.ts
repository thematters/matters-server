import type { GQLCommentResolvers } from 'definitions'

import { CIRCLE_STATE, COMMENT_TYPE } from 'common/enums'

const resolver: GQLCommentResolvers['node'] = async (
  { targetId, targetTypeId, type },
  _,
  { dataSources: { atomService, articleService } }
) => {
  if (!targetId || !targetTypeId) {
    return
  }

  if (type === COMMENT_TYPE.article) {
    const draft = await articleService.draftLoader.load(targetId)
    return { ...draft, __type: 'Article' }
  } else {
    const circle = await atomService.findFirst({
      table: 'circle',
      where: {
        id: targetId,
        state: CIRCLE_STATE.active,
      },
    })

    return { ...circle, __type: 'Circle' }
  }
}

export default resolver
