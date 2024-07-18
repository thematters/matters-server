import type { GQLCommentResolvers } from 'definitions'

import { CIRCLE_STATE, COMMENT_TYPE } from 'common/enums'

const resolver: GQLCommentResolvers['node'] = async (
  { targetId, targetTypeId, type },
  _,
  { dataSources: { atomService } }
) => {
  if (!targetId || !targetTypeId) {
    // TODO: schema is not nullable, but we should handle this case
    return null as any
  }

  if (type === COMMENT_TYPE.article) {
    const draft = await atomService.articleIdLoader.load(targetId)
    return { ...draft, __type: 'Article' }
  } else if (type === COMMENT_TYPE.moment) {
    const moment = await atomService.momentIdLoader.load(targetId)
    return { ...moment, __type: 'Moment' }
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
