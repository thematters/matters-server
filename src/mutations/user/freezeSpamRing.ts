import type { GQLMutationResolvers } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

import { invalidateUserContentCaches } from './utils.js'

const resolver: GQLMutationResolvers['freezeSpamRing'] = async (
  _,
  { input: { id, remark, memberUserIds } },
  {
    viewer,
    dataSources: {
      spamRingService,
      userService,
      articleService,
      connections: { redis },
    },
  }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('viewer has no id')
  }
  const { id: ringId } = fromGlobalId(id)
  const result = await spamRingService.freezeRing({
    ringId,
    actorId: viewer.id,
    remark,
    // audit F1: restrict the freeze to members verified by this detection run
    memberUserIds,
    userService,
  })

  // after the freeze transaction commits, purge cached public query
  // responses so frozen members' content stops being served
  for (const user of result.frozen) {
    await invalidateUserContentCaches(user.id, { articleService, redis })
  }

  return result
}

export default resolver
