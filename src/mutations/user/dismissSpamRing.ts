import type { GQLMutationResolvers } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['dismissSpamRing'] = async (
  _,
  { input: { id, note } },
  { viewer, dataSources: { spamRingService } }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('viewer has no id')
  }
  const { id: ringId } = fromGlobalId(id)
  return spamRingService.dismissRing({ ringId, actorId: viewer.id, note })
}

export default resolver
