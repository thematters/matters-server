import type {
  User,
  Connections,
  MomentFeedUser,
  ValueOf,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  USER_STATE,
  MOMENT_STATE,
  MOMENT_FEED_STATE,
  MOMENT_FEED_REVIEWED_BY,
  MAX_MOMENT_LENGTH,
  IMAGE_ASSET_TYPE,
  NOTICE_TYPE,
  MAX_CONTENT_LINK_TEXT_LENGTH,
  ARTICLE_STATE,
  NODE_TYPES,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import {
  ForbiddenError,
  ForbiddenByStateError,
  UserInputError,
} from '#common/errors.js'
import { auditLog } from '#common/logger.js'
import { shortHash, extractMentionIds, stripHtml } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import { createRequire } from 'node:module'

import { AtomService } from './atomService.js'
import { NotificationService } from './notification/notificationService.js'
import { SpamDetector } from './spamDetector.js'
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

  public findMoments = () => {
    return this.connections.knexRO('Moment').select('*')
  }

  public findMomentFeedUsersAndCount = async ({
    states,
    skip,
    take,
  }: {
    states?: Array<MomentFeedUser['state']>
    skip?: number
    take?: number
  } = {}) => {
    const { knexRO } = this.connections
    const users = await knexRO
      .select('user.*', knexRO.raw('COUNT(1) OVER() ::int AS total_count'))
      .from('user')
      .join('moment_feed_user', 'user.id', 'moment_feed_user.user_id')
      .modify((builder: Knex.QueryBuilder) => {
        if (states && states.length > 0) {
          builder.whereIn('moment_feed_user.state', states)
        }
      })
      .orderBy('moment_feed_user.created_at', 'desc')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    return [users, users[0]?.totalCount || 0] as [User[], number]
  }

  public applyMomentFeed = async (
    user: Pick<User, 'id' | 'state'>
  ): Promise<MomentFeedUser> => {
    if (user.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${user.state} user is not allowed to apply moment feed`
      )
    }

    const existing = await this.models.findFirst({
      table: 'moment_feed_user',
      where: { userId: user.id },
    })
    if (existing) {
      throw new UserInputError(
        `moment feed application already exists with state ${existing.state}`
      )
    }

    return this.models.create({
      table: 'moment_feed_user',
      data: { userId: user.id, state: MOMENT_FEED_STATE.pending },
    })
  }

  public reviewMomentFeedApplication = async ({
    userId,
    state,
    reviewerId,
  }: {
    userId: string
    state: ValueOf<typeof MOMENT_FEED_STATE>
    reviewerId: string
  }): Promise<MomentFeedUser> => {
    const record = await this.models.findFirst({
      table: 'moment_feed_user',
      where: { userId },
    })
    if (!record) {
      throw new UserInputError('moment feed application not found')
    }

    const allowedTransitions: Record<
      ValueOf<typeof MOMENT_FEED_STATE>,
      Array<ValueOf<typeof MOMENT_FEED_STATE>>
    > = {
      [MOMENT_FEED_STATE.pending]: [
        MOMENT_FEED_STATE.approved,
        MOMENT_FEED_STATE.rejected,
      ],
      [MOMENT_FEED_STATE.rejected]: [MOMENT_FEED_STATE.approved],
      [MOMENT_FEED_STATE.approved]: [
        MOMENT_FEED_STATE.approved,
        MOMENT_FEED_STATE.revoked,
      ],
      [MOMENT_FEED_STATE.revoked]: [MOMENT_FEED_STATE.approved],
    }

    if (!allowedTransitions[record.state].includes(state)) {
      throw new UserInputError(
        `cannot change moment feed state from ${record.state} to ${state}`
      )
    }

    return this.models.update({
      table: 'moment_feed_user',
      where: { id: record.id },
      data: {
        state,
        reviewedBy: MOMENT_FEED_REVIEWED_BY.admin,
        reviewerId,
      },
    })
  }

  public autoApproveExpiredMomentFeedApplications = async ({
    expireHours = 48,
  }: { expireHours?: number } = {}): Promise<number> => {
    const cutoff = new Date(Date.now() - expireHours * 60 * 60 * 1000)
    const records = await this.connections
      .knexRO('moment_feed_user')
      .select('*')
      .where({ state: MOMENT_FEED_STATE.pending })
      .andWhere('created_at', '<', cutoff)

    for (const record of records) {
      await this.models.update({
        table: 'moment_feed_user',
        where: { id: record.id },
        data: {
          state: MOMENT_FEED_STATE.approved,
          reviewedBy: MOMENT_FEED_REVIEWED_BY.system,
          reviewerId: null,
        },
      })
      auditLog({
        actorId: null,
        action: AUDIT_LOG_ACTION.autoApproveMomentFeedApplication,
        entity: 'moment_feed_user',
        entityId: record.id,
        status: AUDIT_LOG_STATUS.succeeded,
      })
    }

    return records.length
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

  public detectSpam = async ({
    id,
    content,
  }: {
    id: string
    content: string
  }) => {
    const detector = new SpamDetector(
      environment.shortContentSpamDetectionApiUrl
    )
    const score = await detector.detect(content)

    if (score) {
      await this.models.update({
        table: 'moment',
        where: { id },
        data: { spamScore: score },
      })
    }
    return score
  }
}
