import type { User as UserFull, Connections } from 'definitions'

import { stripHtml } from '@matters/ipns-site-generator'
import {
  sanitizeHTML,
  normalizeMomentHTML,
} from '@matters/matters-editor/transformers'

import {
  USER_STATE,
  MOMENT_STATE,
  MAX_MOMENT_LENGTH,
  IMAGE_ASSET_TYPE,
  NOTICE_TYPE,
  MAX_CONTENT_LINK_TEXT_LENGTH,
} from 'common/enums'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from 'common/errors'
import { shortHash, extractMentionIds } from 'common/utils'
import { AtomService, UserService, NotificationService } from 'connectors'

type User = Pick<UserFull, 'id' | 'state'>

export class MomentService {
  private connections: Connections
  private models: AtomService

  public constructor(connections: Connections) {
    this.connections = connections
    this.models = new AtomService(connections)
  }

  public create = async (
    data: { content: string; assetIds?: string[] },
    user: Pick<UserFull, 'id' | 'state' | 'userName'>
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
    if (contentLength > MAX_MOMENT_LENGTH || contentLength < 1) {
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
    }

    const moment = await this.models.create({
      table: 'moment',
      data: {
        shortHash: shortHash(),
        authorId: user.id,
        content: normalizeMomentHTML(sanitizeHTML(data.content), {
          truncate: {
            maxLength: MAX_CONTENT_LINK_TEXT_LENGTH,
            keepProtocol: false,
          },
        }),
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
        })
      }
    }

    return moment
  }

  public delete = async (id: string, user: User) => {
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
      where: { id },
    })
    if (moment.authorId !== user.id) {
      throw new ForbiddenError(`moment ${id} is not created by user ${user.id}`)
    }
    return this.models.update({
      table: 'moment',
      where: { id, authorId: user.id },
      data: { state: MOMENT_STATE.archived },
    })
  }

  public like = async (id: string, user: User) => {
    if (user.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${user.state} user is not allowed to like moments`
      )
    }
    const moment = await this.models.findUnique({
      table: 'moment',
      where: { id },
    })
    if (moment.authorId === user.id) {
      throw new ForbiddenError(`user ${user.id} cannot like own moment`)
    }
    if (moment.state !== MOMENT_STATE.active) {
      throw new UserInputError(`moment ${id} is not active, cannot be liked`)
    }
    const userService = new UserService(this.connections)
    const isBlocked = await userService.blocked({
      userId: moment.authorId,
      targetId: user.id,
    })
    if (isBlocked) {
      throw new ForbiddenError(`user ${id} is blocked by target author`)
    }
    return this.models.upsert({
      table: 'action_moment',
      where: { targetId: id, userId: user.id },
      create: { targetId: id, userId: user.id, action: 'like' },
      update: { updatedAt: new Date() },
    })
  }

  public unlike = async (id: string, user: User) =>
    this.models.deleteMany({
      table: 'action_moment',
      where: { targetId: id, userId: user.id, action: 'like' },
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
}
