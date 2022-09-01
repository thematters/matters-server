import { TAG_ACTION } from 'common/enums'
import { TagToIsPinnedResolver } from 'definitions'

const resolver: TagToIsPinnedResolver = async (
  { id },
  _,
  { viewer, dataSources: { tagService } }
) => {
  if (!viewer.id) {
    return false
  }

  return tagService.isActionEnabled({
    targetId: id,
    action: TAG_ACTION.pin,
    userId: viewer.id,
  })
}

export default resolver
