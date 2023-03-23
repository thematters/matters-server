import { TAG_ACTION } from 'common/enums/index.js'
import { TagToIsFollowerResolver } from 'definitions'

const resolver: TagToIsFollowerResolver = async (
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
