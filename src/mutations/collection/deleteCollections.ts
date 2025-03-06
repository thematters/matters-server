import type { GQLMutationResolvers } from 'definitions/index.js'

import { invalidateFQC } from '@matters/apollo-response-cache'

import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
  NODE_TYPES,
} from 'common/enums/index.js'
import { ForbiddenError, UserInputError } from 'common/errors.js'
import { auditLog } from 'common/logger.js'
import { fromGlobalId } from 'common/utils/index.js'

const resolver: GQLMutationResolvers['deleteCollections'] = async (
  _,
  { input: { ids } },
  {
    dataSources: {
      collectionService,
      connections: { redis },
    },
    viewer,
  }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }
  if (ids.length === 0) {
    return false
  }

  const unpacked = ids.map((id) => fromGlobalId(id))
  const types = unpacked.map((d) => d.type)

  if (types.some((type) => type !== NODE_TYPES.Collection)) {
    throw new UserInputError('Invalid collection ids')
  }

  const collectionIds = unpacked.map((d) => d.id)

  const result = await collectionService.deleteCollections(
    collectionIds,
    viewer.id
  )
  for (const id of collectionIds) {
    invalidateFQC({ node: { type: NODE_TYPES.Collection, id }, redis })
    auditLog({
      actorId: viewer.id,
      action: AUDIT_LOG_ACTION.removeCollection,
      entity: 'collection',
      entityId: id,
      status: AUDIT_LOG_STATUS.succeeded,
    })
  }
  await invalidateFQC({
    node: { type: NODE_TYPES.User, id: viewer.id },
    redis,
  })
  return result
}

export default resolver
