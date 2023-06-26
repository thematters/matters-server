import trim from 'lodash/trim'
import { validate as validateUUID } from 'uuid'

import { ASSET_TYPE } from 'common/enums'
import {
  ForbiddenError,
  ServerError,
  UserInputError,
  AssetNotFoundError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToPutCollectionResolver } from 'definitions'

const resolver: MutationToPutCollectionResolver = async (
  _,
  { input: { id, title, description, cover } },
  { dataSources: { collectionService, systemService }, viewer }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }

  if (title && title.length > 20) {
    throw new UserInputError('Title too long')
  }
  if (description && description.length > 140) {
    throw new UserInputError('Description too long')
  }

  if (cover && !validateUUID(cover)) {
    throw new AssetNotFoundError('Asset does not exists')
  }

  let coverId
  if (cover) {
    const asset = await systemService.findAssetByUUID(cover)

    if (
      !asset ||
      [ASSET_TYPE.embed, ASSET_TYPE.cover].indexOf(asset.type) < 0 ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('Asset does not exists')
    }

    coverId = asset.id
  }

  const trimedTitle = title ? trim(title) : title
  const trimedDescription = description ? trim(description) : description

  if (id) {
    const { id: dbId } = fromGlobalId(id)
    return await collectionService.updateCollection(dbId, {
      title: trimedTitle,
      description: trimedDescription,
      cover: coverId,
    })
  } else {
    if (!trimedTitle) {
      throw new ServerError('title is required')
    }
    return await collectionService.createCollection({
      authorId: viewer.id,
      title: trimedTitle,
      description: trimedDescription,
      cover: coverId,
    })
  }
}

export default resolver
