import type { GQLMutationResolvers } from 'definitions/index.js'

import { NOTICE_TYPE } from 'common/enums/index.js'
import { AuthenticationError, UserInputError } from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'

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
    tag: `${NOTICE_TYPE.collection_liked}:${viewer.id}:${id}`,
  })

  return collection
}

export const unlikeCollection: GQLMutationResolvers['unlikeCollection'] =
  async (
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
    await collectionService.unlike(id, viewer)
    notificationService.withdraw(
      `${NOTICE_TYPE.collection_liked}:${viewer.id}:${id}`
    )

    return atomService.collectionIdLoader.load(id)
  }
