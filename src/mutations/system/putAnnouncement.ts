import type { GQLMutationResolvers } from '#definitions/index.js'

import { ASSET_TYPE, NODE_TYPES } from '#common/enums/index.js'
import {
  AssetNotFoundError,
  EntityNotFoundError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { isUUID } from '#common/utils/validator.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['putAnnouncement'] = async (
  _,
  { input },
  {
    dataSources: {
      atomService,
      systemService,
      translationService,
      connections,
    },
    viewer,
  }
) => {
  const {
    id: globalId,
    title,
    content,
    cover,
    link,
    type,
    expiredAt,
    visible,
    order,
    channels: channelsInput,
  } = input

  const toCoverURL = async (id: string | null) =>
    id ? systemService.findAssetUrl(id) : null

  // preparation
  let coverId
  if (cover) {
    if (!isUUID(cover)) {
      throw new UserInputError('Invalid announcement cover uuid')
    }
    const asset = await systemService.findAssetByUUID(cover)
    if (
      !asset ||
      asset.type !== ASSET_TYPE.announcementCover ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('Announcement cover asset does not exists')
    }
    coverId = asset.id
  }

  let ret

  // update
  if (globalId) {
    const { id } = fromGlobalId(globalId)
    const item = await atomService.findUnique({
      table: 'announcement',
      where: { id },
    })

    if (!item) {
      throw new EntityNotFoundError(`Target ${id} not found`)
    }

    ret = await atomService.update({
      table: 'announcement',
      where: { id },
      data: {
        title: title ? title[0].text : undefined,
        content: content ? content[0].text : undefined,
        cover: coverId,
        link: link ? link[0].text : undefined,
        type,
        visible,
        expiredAt,
      },
    })
  } else {
    // create
    if (!type) {
      throw new UserInputError('Required parameters missing: type')
    }

    ret = await atomService.create({
      table: 'announcement',
      data: {
        cover: coverId,
        title: title ? title[0].text : undefined,
        content: content ? content[0].text : undefined,
        link: link ? link[0].text : undefined,
        type,
        order,
        visible,
        expiredAt,
      },
    })

    // create or update translations
    if (title) {
      for (const trans of title) {
        await translationService.updateOrCreateTranslation({
          table: 'announcement',
          field: 'title',
          id: ret.id,
          language: trans.language,
          text: trans.text,
        })
      }
    }

    if (content) {
      for (const trans of content) {
        await translationService.updateOrCreateTranslation({
          table: 'announcement',
          field: 'content',
          id: ret.id,
          language: trans.language,
          text: trans.text,
        })
      }
    }

    if (link) {
      for (const trans of link) {
        await translationService.updateOrCreateTranslation({
          table: 'announcement',
          field: 'link',
          id: ret.id,
          language: trans.language,
          text: trans.text,
        })
      }
    }

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

  // Handle channels
  if (channelsInput || channelsInput === null) {
    if (globalId) {
      await atomService.updateMany({
        table: 'channel_announcement',
        where: { announcementId: ret.id },
        data: {
          visible: false,
        },
      })
    }
    await Promise.all(
      channelsInput.map((channelInput) =>
        atomService.upsert({
          table: 'channel_announcement',
          where: {
            announcementId: ret.id,
            channelId: channelInput.channel,
          },
          create: {
            announcementId: ret.id,
            channelId: channelInput.channel,
            visible: channelInput.visible,
            order: channelInput.order,
          },
          update: {
            visible: channelInput.visible,
            order: channelInput.order,
          },
        })
      )
    )
  }

  return {
    ...ret,
    cover: (await toCoverURL(ret.cover)) ?? '',
    translations: [],
  }
}

export default resolver
