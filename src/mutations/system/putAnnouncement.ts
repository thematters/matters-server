import { ASSET_TYPE, NODE_TYPES } from 'common/enums'
import {
  AssetNotFoundError,
  EntityNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { MutationToPutAnnouncementResolver } from 'definitions'

const resolver: MutationToPutAnnouncementResolver = async (
  root,
  { input: { id, cover, link, type, visible, order } },
  { dataSources: { atomService, systemService }, viewer }
) => {
  const table = 'announcement'

  const toAnnouncementId = (dbId: string) =>
    toGlobalId({ type: NODE_TYPES.Announcement, id: dbId })

  const toCoverURL = async (coverId: any) =>
    coverId ? systemService.findAssetUrl(coverId) : null

  // preparation
  let coverDbId
  if (cover) {
    const asset = await systemService.findAssetByUUID(cover)
    if (
      !asset ||
      asset.type !== ASSET_TYPE.announcementCover ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('annuncement cover asset does not exists')
    }
    coverDbId = asset.id
  }

  // update
  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const item = await atomService.findUnique({
      table,
      where: { id: dbId },
    })

    if (!item) {
      throw new EntityNotFoundError(`target ${dbId} not found`)
    }

    const updatedItem = await atomService.update({
      table,
      where: { id: dbId },
      data: {
        ...(coverDbId ? { cover: coverDbId } : {}),
        ...(link ? { link } : {}),
        ...(type ? { type } : {}),
        ...(visible ? { visible } : {}),
      },
    })
    // return updated anounncement
    const updatedAnnouncement = {
      ...updatedItem,
      id: toAnnouncementId(updatedItem.id),
      cover: toCoverURL(updatedItem.cover),
    }
    return updatedAnnouncement
  }

  // create
  if (!type) {
    throw new UserInputError('required parameters missing: type')
  }

  const newItem = await atomService.create({
    table,
    data: { cover: coverDbId, link, type, order: order || 0 },
  })

  // return newly created announcement
  const newAnnouncement = {
    ...newItem,
    id: toAnnouncementId(newItem.id),
    cover: toCoverURL(newItem.cover),
  }
  return newAnnouncement
}

export default resolver
