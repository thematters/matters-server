import type { GQLMutationResolvers } from 'definitions'

import { AuthenticationError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

export const likeCollection: GQLMutationResolvers['likeCollection'] = async (
  _,
  { input: { id: globalId } },
  { viewer, dataSources: { collectionService, atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { id, type } = fromGlobalId(globalId)

  if (type !== 'Collection') {
    throw new UserInputError('invalid id')
  }
  await collectionService.like(id, viewer)

  const collection = await atomService.collectionIdLoader.load(id)

  return collection
}

export const unlikeCollection: GQLMutationResolvers['unlikeCollection'] =
  async (
    _,
    { input: { id: globalId } },
    { viewer, dataSources: { collectionService, atomService } }
  ) => {
    if (!viewer.id) {
      throw new AuthenticationError('visitor has no permission')
    }
    const { id, type } = fromGlobalId(globalId)

    if (type !== 'Collection') {
      throw new UserInputError('invalid id')
    }
    await collectionService.unlike(id, viewer)

    return atomService.collectionIdLoader.load(id)
  }
