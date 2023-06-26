import { ForbiddenError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToDeleteCollectionsResolver } from 'definitions'

const resolver: MutationToDeleteCollectionsResolver = async (
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

  if (types.some((type) => type !== 'Collection')) {
    throw new UserInputError('Invalid collection ids')
  }

  const collectionIds = unpacked.map((d) => d.id)

  return await collectionService.deleteCollections(collectionIds, viewer.id)
}

export default resolver
