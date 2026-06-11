import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

import { COMMENT_STATE, COMMENT_TYPE } from '#common/enums/index.js'

const resolver: GQLWritingChallengeResolvers['discussionCount'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const count = await atomService.count({
    table: 'comment',
    where: {
      state: COMMENT_STATE.active,
      targetId: id,
      type: COMMENT_TYPE.campaignDiscussion,
    },
  })

  return count
}

export default resolver
