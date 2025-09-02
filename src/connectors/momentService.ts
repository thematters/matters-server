import type { User, Connections } from '#definitions/index.js'

import {
  USER_STATE,
  MOMENT_STATE,
  MAX_MOMENT_LENGTH,
  IMAGE_ASSET_TYPE,
  NOTICE_TYPE,
  MAX_CONTENT_LINK_TEXT_LENGTH,
  ARTICLE_STATE,
  NODE_TYPES,
} from '#common/enums/index.js'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from '#common/errors.js'
import { shortHash, extractMentionIds, stripHtml } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import { createRequire } from 'node:module'

import { AtomService } from './atomService.js'
import { NotificationService } from './notification/notificationService.js'
import { UserService } from './userService.js'

const require = createRequire(import.meta.url)
const {
  sanitizeHTML,
  normalizeMomentHTML,
} = require('@matters/matters-editor/transformers')

export class MomentService {
  private connections: Connections
  private models: AtomService

  public constructor(connections: Connections) {
    this.connections = connections
    this.models = new AtomService(connections)
  }

  public create = async (
    data: {
      content: string
      assetIds?: string[]
      // only first tag/article will be linked due to unique(moment_id)
      tagIds?: string[]
      articleIds?: string[]
    },
    user: Pick<User, 'id' | 'state' | 'userName'>
  ) => {
    // check user
    if (user.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${user.state} user is not allowed to create moments`
      )
    }
    if (!user.userName) {
      throw new ForbiddenError('user has no username')
    }
    // check content length
    const contentLength = stripHtml(data.content).length
    if (contentLength > MAX_MOMENT_LENGTH) {
      throw new UserInputError('invalid moment content length')
    }
    // check assets
    if (data.assetIds && data.assetIds.length > 0) {
      const assets = await this.models.assetIdLoader.loadMany(data.assetIds)
      for (const asset of assets) {
        if (asset.authorId !== user.id) {
          throw new UserInputError(
            `asset ${asset.id} is not created by user ${user.id}`
          )
        }
        if (asset.type !== IMAGE_ASSET_TYPE.moment) {
          throw new UserInputError(`asset ${asset.id} is not a moment asset`)
        }
      }
    } else {
      // no assets
      if (contentLength === 0) {
        throw new UserInputError('empty moment content and assets')
      }
    }

    const moment = await this.models.create({
      table: 'moment',
      data: {
        shortHash: shortHash(),
        authorId: user.id,
        content: normalizeMomentHTML(
          sanitizeHTML(data.content, {
            maxHardBreaks: 1,
            maxSoftBreaks: 2,
          }),
          {
            truncate: {
              maxLength: MAX_CONTENT_LINK_TEXT_LENGTH,
              keepProtocol: false,
            },
          }
        ),
        state: MOMENT_STATE.active,
      },
    })
    if (data.assetIds && data.assetIds.length > 0) {
      await Promise.all(
        data.assetIds.map((assetId) =>
          this.models.create({
            table: 'moment_asset',
            data: { assetId, momentId: moment.id },
          })
        )
      )
    }

    // link one article if provided and valid
    if (data.articleIds && data.articleIds.length > 0) {
      const articleId = data.articleIds[0]
      const article = await this.models.findUnique({
        table: 'article',
        where: { id: articleId },
      })
      if (article && article.state === ARTICLE_STATE.active) {
        await this.models.upsert({
          table: 'moment_article',
          where: { momentId: moment.id },
          create: { momentId: moment.id, articleId },
          update: { articleId },
        })
      }
    }

    // link one tag if provided
    if (data.tagIds && data.tagIds.length > 0) {
      await this.models.upsert({
        table: 'moment_tag',
        where: { momentId: moment.id },
        create: { momentId: moment.id, tagId: data.tagIds[0] },
        update: { tagId: data.tagIds[0] },
      })
      invalidateFQC({
        node: { type: NODE_TYPES.Tag, id: data.tagIds[0] },
        redis: this.connections.redis,
      })
    }
    // notify mentioned users
    const notificationService = new NotificationService(this.connections)
    const mentionedUserIds = extractMentionIds(data.content)

    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId !== user.id) {
        notificationService.trigger({
          event: NOTICE_TYPE.moment_mentioned_you,
          actorId: user.id,
          recipientId: mentionedUserId,
          entities: [{ type: 'target', entityTable: 'moment', entity: moment }],
          tag: `put-moment:${moment.id}`,
        })
      }
    }

    return moment
  }

  public delete = async (
    momentId: string,
    user: Pick<User, 'id' | 'state'>
  ) => {
    if (
      ![USER_STATE.active as string, USER_STATE.banned as string].includes(
        user.state
      )
    ) {
      throw new ForbiddenByStateError(
        `${user.state} user is not allowed to delete moments`
      )
    }
    const moment = await this.models.findUnique({
      table: 'moment',
      where: { id: momentId },
    })
    if (moment.authorId !== user.id) {
      throw new ForbiddenError(
        `moment ${momentId} is not created by user ${user.id}`
      )
    }
    return this.models.update({
      table: 'moment',
      where: { id: momentId, authorId: user.id },
      data: { state: MOMENT_STATE.archived },
    })
  }

  public like = async (momentId: string, user: Pick<User, 'id' | 'state'>) => {
    if (user.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${user.state} user is not allowed to like moments`
      )
    }
    const moment = await this.models.findUnique({
      table: 'moment',
      where: { id: momentId },
    })
    if (moment.state !== MOMENT_STATE.active) {
      throw new UserInputError(
        `moment ${momentId} is not active, cannot be liked`
      )
    }
    const userService = new UserService(this.connections)
    const isBlocked = await userService.blocked({
      userId: moment.authorId,
      targetId: user.id,
    })
    if (isBlocked) {
      throw new ForbiddenError(`user ${momentId} is blocked by target author`)
    }
    return this.models.upsert({
      table: 'action_moment',
      where: { targetId: momentId, userId: user.id },
      create: { targetId: momentId, userId: user.id, action: 'like' },
      update: { updatedAt: new Date() },
    })
  }

  public unlike = async (momentId: string, user: Pick<User, 'id'>) =>
    this.models.deleteMany({
      table: 'action_moment',
      where: { targetId: momentId, userId: user.id, action: 'like' },
    })

  public isLiked = async (momentId: string, userId: string) => {
    const count = await this.models.count({
      table: 'action_moment',
      where: { targetId: momentId, userId: userId, action: 'like' },
    })
    return count > 0
  }

  public countLikes = async (momentId: string) =>
    this.models.count({
      table: 'action_moment',
      where: { targetId: momentId, action: 'like' },
    })

  public getAssets = async (momentId: string) => {
    const momentAssets = await this.models.findMany({
      table: 'moment_asset',
      where: { momentId },
      orderBy: [{ column: 'createdAt', order: 'asc' }],
    })
    return Promise.all(
      momentAssets.map((momentAsset) =>
        this.models.assetIdLoader.load(momentAsset.assetId)
      )
    )
  }

  public getArticles = async (momentId: string) => {
    const record = await this.models.findFirst({
      table: 'moment_article',
      where: { momentId },
    })
    if (!record) return []
    const article = await this.models.articleIdLoader.load(record.articleId)
    return article ? [article] : []
  }

  public getTags = async (momentId: string) => {
    const record = await this.models.findFirst({
      table: 'moment_tag',
      where: { momentId },
    })
    if (!record) return []
    const tag = await this.models.tagIdLoader.load(record.tagId)
    return tag ? [tag] : []
  }
}
