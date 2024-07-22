import type { GQLMutationResolvers } from 'definitions'

import { NOTICE_TYPE } from 'common/enums'
import { AuthenticationError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

export const likeCollection: GQLMutationResolvers['likeCollection'] = async (
  _,
  { input: { id: globalId } },
  {
    viewer,
    dataSources: { collectionService, atomService, notificationService },
  }
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

  notificationService.trigger({
    event: NOTICE_TYPE.collection_liked,
    actorId: viewer.id,
    recipientId: collection.authorId,
    entities: [
      { type: 'target', entityTable: 'collection', entity: collection },
    ],
  })

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
