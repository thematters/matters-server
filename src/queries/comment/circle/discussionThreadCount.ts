import type { GQLCircleResolvers } from '#definitions/index.js'

import { COMMENT_TYPE } from '#common/enums/index.js'

const resolver: GQLCircleResolvers['discussionThreadCount'] = async (
  { id },
  _,
  { viewer, dataSources: { commentService } }
) =>
  commentService.count(id, COMMENT_TYPE.circleDiscussion, {
    parentCommentId: null,
    includeRestrictedAuthors: viewer.hasRole('admin'),
  })

export default resolver
