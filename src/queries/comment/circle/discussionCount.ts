import type { GQLCircleResolvers } from 'definitions'

import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'

const resolver: GQLCircleResolvers['discussionCount'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const count = await atomService.count({
    table: 'comment',
    where: {
      state: COMMENT_STATE.active,
      targetId: id,
      type: COMMENT_TYPE.circleDiscussion,
    },
  })

  return count
}

export default resolver
