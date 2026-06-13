import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

import { COMMENT_TYPE } from '#common/enums/index.js'

const resolver: GQLWritingChallengeResolvers['discussionCount'] = async (
  { id },
  _,
  { dataSources: { commentService } }
) => commentService.count(id, COMMENT_TYPE.campaignDiscussion)

export default resolver
