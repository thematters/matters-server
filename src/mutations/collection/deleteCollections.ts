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

  try {
    return await collectionService.deleteCollections(collectionIds, viewer.id)
  } catch (e: any) {
    if (e.message === 'Collection not found') {
      throw new UserInputError('Collection not found')
    }
    if (e.message === 'Author id not match') {
      throw new ForbiddenError('Viewer has no permission')
    }
    throw e
  }
}

export default resolver
