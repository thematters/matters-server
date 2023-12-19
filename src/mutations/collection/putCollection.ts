import type { GQLMutationResolvers } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'
import { validate as validateUUID } from 'uuid'

import {
  ASSET_TYPE,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
  MAX_COLLECTION_TITLE_LENGTH,
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  NODE_TYPES,
} from 'common/enums'
import {
  ForbiddenError,
  EntityNotFoundError,
  UserInputError,
  AssetNotFoundError,
} from 'common/errors'
import { auditLog } from 'common/logger'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['putCollection'] = async (
  _,
  { input: { id, title, description, cover, pinned } },
  {
    dataSources: {
      collectionService,
      systemService,
      connections: { redis },
    },
    viewer,
  }
) => {
  if (!viewer.userName) {
    throw new ForbiddenError('User has no permission')
  }

  if (title && title.length > MAX_COLLECTION_TITLE_LENGTH) {
    throw new UserInputError('Title too long')
  }
  if (description && description.length > MAX_COLLECTION_DESCRIPTION_LENGTH) {
    throw new UserInputError('Description too long')
  }

  if (cover && !validateUUID(cover)) {
    throw new AssetNotFoundError('Asset does not exists')
  }

  if (id && fromGlobalId(id).type !== NODE_TYPES.Collection) {
    throw new UserInputError('Invalid Collection id')
  }

  let coverId
  if (cover) {
    const asset = await systemService.findAssetByUUID(cover)

    if (
      !asset ||
      asset.type !== ASSET_TYPE.collectionCover ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('Asset does not exists')
    }

    coverId = asset.id
  }

  const trimedTitle = title ? title.trim() : title
  const trimedDescription = description ? description.trim() : description

  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const collection = await collectionService.baseFindById(dbId)
    if (!collection) {
      throw new EntityNotFoundError('Collection not found')
    }
    if (collection.authorId !== viewer.id) {
      throw new ForbiddenError('Viewer has no permission')
    }

    let res
    if (typeof pinned === 'boolean') {
      res = await collectionService.updatePinned(dbId, viewer.id, pinned)
      await invalidateFQC({
        node: { type: NODE_TYPES.User, id: collection.authorId },
        redis,
      })
    }

    if (title ?? description ?? cover) {
      res = await collectionService.updateCollection(dbId, {
        title: trimedTitle,
        description: trimedDescription,
        cover: coverId,
      })
    }
    return res ?? collection
  } else {
    if (!trimedTitle) {
      throw new UserInputError('title is required')
    }
    const collection = await collectionService.createCollection({
      authorId: viewer.id,
      title: trimedTitle,
      description: trimedDescription,
      cover: coverId,
      pinned,
    })
    await invalidateFQC({
      node: { type: NODE_TYPES.User, id: collection.authorId },
      redis,
    })
    auditLog({
      actorId: viewer.id,
      action: AUDIT_LOG_ACTION.createCollection,
      entity: 'collection',
      entityId: collection.id,
      status: AUDIT_LOG_STATUS.succeeded,
    })
    return collection
  }
}

export default resolver
