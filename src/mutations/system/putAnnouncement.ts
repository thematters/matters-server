import type { GQLMutationResolvers } from 'definitions/index.js'

import { invalidateFQC } from '@matters/apollo-response-cache'
import lodash from 'lodash'

import { ASSET_TYPE, NODE_TYPES } from 'common/enums/index.js'
import {
  AssetNotFoundError,
  EntityNotFoundError,
  UserInputError,
} from 'common/errors.js'
import { fromGlobalId, toGlobalId } from 'common/utils/index.js'

const resolver: GQLMutationResolvers['putAnnouncement'] = async (
  _,
  { input },
  { dataSources: { atomService, systemService, connections }, viewer }
) => {
  const {
    id,
    // title, content, cover, link,
    type,
    expiredAt,
    visible,
    order,
    translations,
  } = input
  const toAnnouncementId = (dbId: string) =>
    toGlobalId({ type: NODE_TYPES.Announcement, id: dbId })

  const toCoverURL = async (coverId: string | null) =>
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
        expiredAt,
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
        expiredAt,
      },
    })

    // query and purge previous announcements
    // since the resolve return new announcement which is not cached
    const prevAnnouncements = await atomService.findMany({
      table: 'announcement',
      where: { visible: true },
    })
    await Promise.all(
      prevAnnouncements.map((announcement) =>
        invalidateFQC({
          node: { type: NODE_TYPES.Announcement, id: announcement.id },
          redis: connections.redis,
        })
      )
    )
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

  return {
    ...ret,
    id: toAnnouncementId(ret.id),
    cover: (await toCoverURL(ret.cover)) ?? '',
    translations:
      translations &&
      transResults.map((tr: any) => ({
        ...tr,
        cover: toCoverURL(tr.cover),
      })),
  }
}

export default resolver
