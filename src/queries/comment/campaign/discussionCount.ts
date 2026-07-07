import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

import { COMMENT_TYPE } from '#common/enums/index.js'

const resolver: GQLWritingChallengeResolvers['discussionCount'] = async (
  { id },
  _,
  { viewer, dataSources: { commentService } }
) =>
  commentService.count(id, COMMENT_TYPE.campaignDiscussion, {
    includeRestrictedAuthors: viewer.hasRole('admin'),
  })

export default resolver
