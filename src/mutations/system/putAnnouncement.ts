import lodash from 'lodash'

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
  { input },
  { dataSources: { atomService, systemService }, viewer }
) => {
  const {
    id,
    // title, content, cover, link,
    type,
    visible,
    order,
    translations,
  } = input
  const toAnnouncementId = (dbId: string) =>
    toGlobalId({ type: NODE_TYPES.Announcement, id: dbId })

  const toCoverURL = async (coverId: any) =>
    coverId ? systemService.findAssetUrl(coverId) : null

  // preparation
  let coverDbId
  if (input.cover) {
    const asset = await systemService.findAssetByUUID(input.cover)
    if (
      !asset ||
      asset.type !== ASSET_TYPE.announcementCover ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('annuncement cover asset does not exists')
    }
    coverDbId = asset.id
  }

  let ret

  // update
  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const item = await atomService.findUnique({
      table: 'announcement',
      where: { id: dbId },
    })

    if (!item) {
      throw new EntityNotFoundError(`target ${dbId} not found`)
    }

    const { title, content, link } = input
    const data = lodash.omitBy(
      {
        title,
        content,
        cover: coverDbId,
        link,
        type,
        visible,
      },
      lodash.isUndefined
    )
    ret = await atomService.update({
      table: 'announcement',
      where: { id: dbId },
      data,
    })
  } else {
    // create
    if (!type) {
      throw new UserInputError('required parameters missing: type')
    }

    const { title, content, link } = input
    ret = await atomService.create({
      table: 'announcement',
      data: {
        cover: coverDbId,
        title,
        content,
        link,
        type,
        order, // default to 0 // : order || 0
      },
    })
  }

  const announcementId = ret.id
  const transResults = []
  for (const tr of translations || []) {
    const { language, title, cover, content, link } = tr
    // only 'en' translations for now
    // if (!(language in { en: 1 })) { // console.log('unrecognized language:', tr); continue; }

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

    transResults.push(
      await atomService.upsert({
        table: 'announcement_translation',
        where: { announcementId, language },
        create: {
          announcementId, // annoucementId,
          language,
          title,
          cover: coverDbId,
          content,
          link,
        },
        update: { language, title, cover: coverDbId, content, link },
      })
    )
  }

  // return newly created announcement
  // const newAnnouncement = {
  return {
    ...ret,
    id: toAnnouncementId(ret.id),
    cover: toCoverURL(ret.cover),
    translations:
      translations &&
      transResults.map((tr: any) => ({
        ...tr,
        cover: toCoverURL(tr.cover),
      })),
  }

  // return newAnnouncement
}

export default resolver
