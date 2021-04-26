import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
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
  let action: 'follow' | 'unfollow'
  if (enabled === undefined) {
    const isFollower = await tagService.isFollower({
      targetId: tag.id,
      userId: viewer.id,
    })
    action = !!isFollower ? 'unfollow' : 'follow'
  } else {
    action = enabled ? 'follow' : 'unfollow'
  }

  // run action
  if (action === 'follow') {
    await tagService.follow({ targetId: tag.id, userId: viewer.id })
  } else {
    await tagService.unfollow({ targetId: tag.id, userId: viewer.id })
  }

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
