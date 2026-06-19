import type { GQLMutationResolvers } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['unfreezeSpamRing'] = async (
  _,
  { input: { id } },
  { viewer, dataSources: { spamRingService, userService } }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('viewer has no id')
  }
  const { id: ringId } = fromGlobalId(id)
  return spamRingService.unfreezeRing({
    ringId,
    actorId: viewer.id,
    userService,
  })
}

export default resolver
