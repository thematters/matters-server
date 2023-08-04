import type { GQLMutationResolvers } from 'definitions'

import { CACHE_KEYWORD, NODE_TYPES, TAG_ACTION } from 'common/enums'
import { AuthenticationError, TagNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['togglePinTag'] = async (
  _,
  { input: { id, enabled } },
  { viewer, dataSources: { tagService } }
) => {
  // checks
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const tag = await tagService.loadById(dbId)

  if (!tag) {
    throw new TagNotFoundError('target user does not exists')
  }

  // determine action
  if (enabled === undefined) {
    const isPinned = await tagService.isActionEnabled({
      targetId: tag.id,
      action: TAG_ACTION.pin,
      userId: viewer.id,
    })
    enabled = !isPinned
  }

  // run action
  await tagService.setActionEnabled({
    userId: viewer.id,
    action: TAG_ACTION.pin,
    targetId: tag.id,
    enabled,
  })

  // invalidate extra nodes
  // @ts-ignore
  tag[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.User,
    },
  ]

  return tag
}

export default resolver
