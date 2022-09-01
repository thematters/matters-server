import { CACHE_KEYWORD, NODE_TYPES, TAG_ACTION } from 'common/enums'
import { AuthenticationError, TagNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleFollowTagResolver } from 'definitions'

const resolver: MutationToToggleFollowTagResolver = async (
  _,
  { input: { id, enabled } },
  { viewer, dataSources: { tagService } }
) => {
  // checks
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const tag = await tagService.dataloader.load(dbId)

  if (!tag) {
    throw new TagNotFoundError('target user does not exists')
  }

  // determine action
  if (enabled === undefined) {
    const isFollowed = await tagService.isActionEnabled({
      targetId: tag.id,
      action: TAG_ACTION.follow,
      userId: viewer.id,
    })
    enabled = !isFollowed
  }

  // run action
  await tagService.setActionEnabled({
    userId: viewer.id,
    action: TAG_ACTION.follow,
    targetId: tag.id,
    enabled,
  })

  // invalidate extra nodes
  tag[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.User,
    },
  ]

  return tag
}

export default resolver
