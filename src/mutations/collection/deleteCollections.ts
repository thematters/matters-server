import type { GQLMutationResolvers } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import { NODE_TYPES } from 'common/enums'
import { ForbiddenError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { redis } from 'connectors'

const resolver: GQLMutationResolvers['deleteCollections'] = async (
  _,
  { input: { ids } },
  { dataSources: { collectionService }, viewer }
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
  }
  return result
}

export default resolver
