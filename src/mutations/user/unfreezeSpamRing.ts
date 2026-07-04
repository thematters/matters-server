import type { GQLMutationResolvers } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

import { invalidateUserContentCaches } from './utils.js'

const resolver: GQLMutationResolvers['unfreezeSpamRing'] = async (
  _,
  { input: { id } },
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
  const result = await spamRingService.unfreezeRing({
    ringId,
    actorId: viewer.id,
    userService,
  })

  // after the unfreeze transaction commits, purge cached public query
  // responses so restored members' content shows up again promptly
  for (const user of result.unbanned) {
    await invalidateUserContentCaches(user.id, { articleService, redis })
  }

  return result
}

export default resolver
