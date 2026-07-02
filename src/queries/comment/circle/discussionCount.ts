import type { GQLCircleResolvers } from '#definitions/index.js'

import { COMMENT_TYPE } from '#common/enums/index.js'

const resolver: GQLCircleResolvers['discussionCount'] = async (
  { id },
  _,
  { viewer, dataSources: { commentService } }
) =>
  commentService.count(id, COMMENT_TYPE.circleDiscussion, {
    includeRestrictedAuthors: viewer.hasRole('admin'),
  })

export default resolver
