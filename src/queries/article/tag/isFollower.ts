import type { GQLTagResolvers } from 'definitions/index.js'

import { TAG_ACTION } from 'common/enums/index.js'

const resolver: GQLTagResolvers['isFollower'] = async (
  { id },
  _,
  { viewer, dataSources: { tagService } }
) => {
  if (!viewer.id) {
    return false
  }

  return tagService.isActionEnabled({
    targetId: id,
    action: TAG_ACTION.follow,
    userId: viewer.id,
  })
}

export default resolver
