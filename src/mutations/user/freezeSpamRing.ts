import type { GQLMutationResolvers } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['freezeSpamRing'] = async (
  _,
  { input: { id, remark } },
  { viewer, dataSources: { spamRingService, userService } }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('viewer has no id')
  }
  const { id: ringId } = fromGlobalId(id)
  return spamRingService.freezeRing({
    ringId,
    actorId: viewer.id,
    remark,
    userService,
  })
}

export default resolver
