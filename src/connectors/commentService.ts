import type {
  Article,
  Campaign,
  Circle,
  Comment,
  CommunityWatchAction,
  CommunityWatchActionReason,
  CommunityWatchAppealState,
  Connections,
  GQLCommentCommentsInput,
  GQLCommentsInput,
  ModerationActorType,
  ModerationCase,
  ModerationCaseOutcome,
  ModerationCaseStatus,
  ModerationEventType,
  CommunityWatchReviewState,
  User,
  ValueOf,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  ARTICLE_PIN_COMMENT_LIMIT,
  COMMENT_STATE,
  COMMENT_TYPE,
  USER_STATE,
  USER_ACTION,
  USER_FEATURE_FLAG_TYPE,
  NOTICE_TYPE,
  NODE_TYPES,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import {
  CommentNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import { enqueueReportAlert } from '#common/notifications/reportAlert.js'
import { toGlobalId } from '#common/utils/index.js'
import { v4 } from 'uuid'

import { BaseService } from './baseService.js'
import { CampaignService } from './campaignService.js'
import {
  classifyContentTier,
  nearDuplicate,
  normalizeForDup,
  stripHtml,
  RING_MIN_FAMILY,
  TIER_REASON,
  type CommentSpamTier,
} from './commentSpamSignals.js'
import { NotificationService } from './notification/notificationService.js'
import { PaymentService } from './paymentService.js'
import { SpamDetector } from './spamDetector.js'
import { SystemService } from './systemService.js'
import { UserService } from './userService.js'

const logger = getLogger('comment-service')

export interface CommentFilter {
  type: ValueOf<typeof COMMENT_TYPE>
  targetId: string
  targetTypeId: string
  parentCommentId?: string | null
  authorId?: string
  state?: string
}

export type CommunityWatchActionsFilter = {
  reason?: string | null
  actionState?: string | null
  appealState?: string | null
  reviewState?: string | null
}

export type CommunityWatchActionStateUpdate = {
  uuid: string
  actorId: string
  appealState?: CommunityWatchAppealState | null
  reviewState?: CommunityWatchReviewState | null
  reason?: CommunityWatchActionReason | null
  note?: string | null
}

type CommunityWatchReviewEventType =
  | 'appeal_received'
  | 'appeal_resolved'
  | 'review_upheld'
  | 'review_reversed'
  | 'reason_changed'
  | 'comment_restored'
  | 'content_cleared'
  | 'state_updated'

export class CommentService extends BaseService<Comment> {
  public constructor(connections: Connections) {
    super('comment', connections)
  }

  // Query builder for the OSS comment list (sortable / filterable).
  public findComments = () => this.knexRO(this.table).select('*')

  public findActiveCommunityWatchAction = async (
    commentId: string
  ): Promise<CommunityWatchAction | null> => {
    const action = await this.knex('community_watch_action')
      .select()
      .where({ commentId, actionState: 'active' })
      .first()
    return action ?? null
  }

  public findCommunityWatchActionByUUID = async (
    uuid: string
  ): Promise<CommunityWatchAction | null> => {
    const action = await this.knex('community_watch_action')
      .select()
      .where({ uuid })
      .first()
    return action ?? null
  }

  public findCommunityWatchActionById = async (
    id: string
  ): Promise<CommunityWatchAction | null> => {
    const action = await this.knex('community_watch_action')
      .select()
      .where({ id })
      .first()
    return action ?? null
  }

  public findCommunityWatchActions = async ({
    filter,
    skip,
    take,
  }: {
    filter: CommunityWatchActionsFilter
    skip: number
    take: number
  }): Promise<[CommunityWatchAction[], number]> => {
    // Community Watch audit records are read immediately after moderation and review mutations.
    const baseQuery = this.knex('community_watch_action').select()

    if (filter.reason) {
      baseQuery.where({ reason: filter.reason })
    }
    if (filter.actionState) {
      baseQuery.where({ actionState: filter.actionState })
    }
    if (filter.appealState) {
      baseQuery.where({ appealState: filter.appealState })
    }
    if (filter.reviewState) {
      baseQuery.where({ reviewState: filter.reviewState })
    }

    const [actions, countResult] = await Promise.all([
      baseQuery
        .clone()
        .orderBy('createdAt', 'desc')
        .orderBy('id', 'desc')
        .offset(skip)
        .limit(take),
      baseQuery.clone().count('*').first(),
    ])

    return [actions, Number(countResult?.count || 0)]
  }

  public updateCommunityWatchActionState = async ({
    uuid,
    actorId,
    appealState,
    reviewState,
    reason,
    note,
  }: CommunityWatchActionStateUpdate): Promise<CommunityWatchAction> => {
    if (!appealState && !reviewState && !reason) {
      throw new UserInputError('no Community Watch action update provided')
    }
    if (reviewState === 'reversed') {
      throw new UserInputError(
        'use restoreCommunityWatchComment to reverse an action'
      )
    }

    let moderationSync:
      | {
          previousAction: CommunityWatchAction
          action: CommunityWatchAction
          actorId: string
          note?: string | null
          events: Array<{
            eventType: CommunityWatchReviewEventType
            oldValue: string | null
            newValue: string | null
          }>
        }
      | undefined

    const updatedAction = await this.knex.transaction(async (trx) => {
      const action = await trx<CommunityWatchAction>('community_watch_action')
        .select()
        .where({ uuid })
        .forUpdate()
        .first()
      if (!action) {
        throw new UserInputError('Community Watch action not found')
      }

      const now = new Date()
      const patch: Partial<CommunityWatchAction> = {
        reviewerId: actorId,
        reviewNote: note || null,
        reviewedAt: now,
        updatedAt: now,
      }
      const events: Array<{
        eventType: CommunityWatchReviewEventType
        oldValue: string | null
        newValue: string | null
      }> = []

      if (appealState && appealState !== action.appealState) {
        patch.appealState = appealState
        events.push({
          eventType:
            appealState === 'received'
              ? 'appeal_received'
              : appealState === 'resolved'
              ? 'appeal_resolved'
              : 'state_updated',
          oldValue: action.appealState,
          newValue: appealState,
        })
      }

      if (reviewState && reviewState !== action.reviewState) {
        patch.reviewState = reviewState
        events.push({
          eventType:
            reviewState === 'upheld' ? 'review_upheld' : 'state_updated',
          oldValue: action.reviewState,
          newValue: reviewState,
        })
      }

      if (reason && reason !== action.reason) {
        patch.reason = reason
        if (!patch.reviewState) {
          patch.reviewState = 'reason_adjusted'
        }
        events.push({
          eventType: 'reason_changed',
          oldValue: action.reason,
          newValue: reason,
        })
      }

      if (events.length === 0) {
        events.push({
          eventType: 'state_updated',
          oldValue: null,
          newValue: null,
        })
      }

      const [updatedCommunityWatchAction] = await trx<CommunityWatchAction>(
        'community_watch_action'
      )
        .where({ id: action.id })
        .update(patch)
        .returning('*')

      await this.insertCommunityWatchReviewEvents(trx, {
        actionId: action.id,
        actorId,
        note,
        events,
      })

      moderationSync = {
        previousAction: action,
        action: updatedCommunityWatchAction,
        actorId,
        note,
        events,
      }

      return updatedCommunityWatchAction
    })

    if (moderationSync) {
      await this.syncCommunityWatchModerationCaseTransition(moderationSync)
    }

    return updatedAction
  }

  public restoreCommunityWatchComment = async ({
    uuid,
    actorId,
    note,
  }: {
    uuid: string
    actorId: string
    note?: string | null
  }): Promise<{ action: CommunityWatchAction; comment: Comment }> => {
    let moderationSync:
      | {
          previousAction: CommunityWatchAction
          action: CommunityWatchAction
          actorId: string
          note?: string | null
        }
      | undefined

    const result = await this.knex.transaction(async (trx) => {
      const action = await trx<CommunityWatchAction>('community_watch_action')
        .select()
        .where({ uuid })
        .forUpdate()
        .first()
      if (!action) {
        throw new UserInputError('Community Watch action not found')
      }
      if (action.actionState !== 'active') {
        throw new UserInputError('Community Watch action is not active')
      }

      const comment = await trx<Comment>('comment')
        .select()
        .where({ id: action.commentId })
        .forUpdate()
        .first()
      if (!comment) {
        throw new CommentNotFoundError('comment not found')
      }
      if (comment.state !== COMMENT_STATE.banned) {
        throw new UserInputError('comment is not restorable')
      }

      const now = new Date()
      const [updatedComment] = await trx<Comment>('comment')
        .where({ id: comment.id })
        .update({
          state: action.originalState,
          updatedAt: now,
        })
        .returning('*')
      const [updatedAction] = await trx<CommunityWatchAction>(
        'community_watch_action'
      )
        .where({ id: action.id })
        .update({
          actionState: 'restored',
          appealState: 'resolved',
          reviewState: 'reversed',
          reviewerId: actorId,
          reviewNote: note || null,
          reviewedAt: now,
          updatedAt: now,
        })
        .returning('*')

      const events: Array<{
        eventType: CommunityWatchReviewEventType
        oldValue: string | null
        newValue: string | null
      }> = [
        {
          eventType: 'comment_restored',
          oldValue: comment.state,
          newValue: action.originalState,
        },
      ]

      if (action.reviewState !== 'reversed') {
        events.push({
          eventType: 'review_reversed',
          oldValue: action.reviewState,
          newValue: 'reversed',
        })
      }

      if (action.appealState !== 'resolved') {
        events.push({
          eventType: 'appeal_resolved',
          oldValue: action.appealState,
          newValue: 'resolved',
        })
      }

      await this.insertCommunityWatchReviewEvents(trx, {
        actionId: action.id,
        actorId,
        note,
        events,
      })

      moderationSync = {
        previousAction: action,
        action: updatedAction,
        actorId,
        note,
      }

      return { action: updatedAction, comment: updatedComment }
    })

    if (moderationSync) {
      await this.syncCommunityWatchModerationCaseRestored(moderationSync)
    }

    return result
  }

  public clearCommunityWatchOriginalContent = async ({
    uuid,
    actorId,
    note,
  }: {
    uuid: string
    actorId: string
    note?: string | null
  }): Promise<CommunityWatchAction> =>
    this.knex.transaction(async (trx) => {
      const action = await trx<CommunityWatchAction>('community_watch_action')
        .select()
        .where({ uuid })
        .forUpdate()
        .first()
      if (!action) {
        throw new UserInputError('Community Watch action not found')
      }

      const now = new Date()
      const [updatedAction] = await trx<CommunityWatchAction>(
        'community_watch_action'
      )
        .where({ id: action.id })
        .update({
          originalContent: null,
          reviewerId: actorId,
          reviewNote: note || null,
          reviewedAt: now,
          updatedAt: now,
        })
        .returning('*')

      await this.insertCommunityWatchReviewEvents(trx, {
        actionId: action.id,
        actorId,
        note,
        events: [
          {
            eventType: 'content_cleared',
            oldValue: action.originalContent ? 'present' : null,
            newValue: null,
          },
        ],
      })

      return updatedAction
    })

  private insertCommunityWatchReviewEvents = async (
    trx: Knex.Transaction,
    {
      actionId,
      actorId,
      note,
      events,
    }: {
      actionId: string
      actorId: string
      note?: string | null
      events: Array<{
        eventType: CommunityWatchReviewEventType
        oldValue: string | null
        newValue: string | null
      }>
    }
  ) => {
    const now = new Date()
    await trx('community_watch_review_event').insert(
      events.map(({ eventType, oldValue, newValue }) => ({
        uuid: v4(),
        actionId,
        eventType,
        actorId,
        oldValue,
        newValue,
        note: note || null,
        createdAt: now,
      }))
    )
  }

  public syncCommunityWatchModerationCaseCreated = async ({
    action,
  }: {
    action: CommunityWatchAction
  }) => {
    try {
      await this.knex.transaction(async (trx) => {
        const { moderationCase, created } =
          await this.findOrCreateCommunityWatchModerationCase(trx, action)

        if (created) {
          await this.createCommunityWatchModerationEvent(trx, {
            moderationCase,
            eventType: 'created',
            actorType: 'community_watcher',
            actorId: action.actorId,
            toStatus: 'received',
            publicReason: action.reason,
            metadata: this.toCommunityWatchModerationMetadata(action),
          })
        }

        if (
          moderationCase.status !== 'action_taken' ||
          moderationCase.outcome !== 'content_hidden'
        ) {
          await trx('moderation_case').where({ id: moderationCase.id }).update({
            status: 'action_taken',
            outcome: 'content_hidden',
            noticeState: 'pending',
            updatedAt: trx.fn.now(),
          })

          await this.createCommunityWatchModerationEvent(trx, {
            moderationCase,
            eventType: 'actioned',
            actorType: 'community_watcher',
            actorId: action.actorId,
            fromStatus: moderationCase.status,
            toStatus: 'action_taken',
            fromOutcome: moderationCase.outcome,
            toOutcome: 'content_hidden',
            publicReason: action.reason,
            metadata: this.toCommunityWatchModerationMetadata(action),
          })
        }
      })
    } catch (error) {
      logger.error(error)
    }
  }

  private syncCommunityWatchModerationCaseTransition = async ({
    previousAction,
    action,
    actorId,
    note,
    events,
  }: {
    previousAction: CommunityWatchAction
    action: CommunityWatchAction
    actorId: string
    note?: string | null
    events: Array<{
      eventType: CommunityWatchReviewEventType
      oldValue: string | null
      newValue: string | null
    }>
  }) => {
    const relevantEvents = events.filter(({ eventType }) =>
      [
        'appeal_received',
        'appeal_resolved',
        'review_upheld',
        'reason_changed',
      ].includes(eventType)
    )
    if (relevantEvents.length <= 0) {
      return
    }

    try {
      await this.knex.transaction(async (trx) => {
        let moderationCase =
          await this.resolveCommunityWatchModerationCaseForAction(trx, {
            previousAction,
            action,
          })

        for (const event of relevantEvents) {
          if (event.eventType === 'reason_changed') {
            await this.createCommunityWatchModerationEvent(trx, {
              moderationCase,
              eventType: 'reviewed',
              actorType: 'admin',
              actorId,
              publicReason: action.reason,
              internalNote: note,
              metadata: {
                ...this.toCommunityWatchModerationMetadata(action),
                communityWatchEvent: event.eventType,
                oldReason: event.oldValue,
                newReason: event.newValue,
              },
            })
            continue
          }

          const next =
            event.eventType === 'appeal_received'
              ? { status: 'appealed' as const }
              : event.eventType === 'appeal_resolved'
              ? { status: 'resolved' as const, resolvedAt: trx.fn.now() }
              : {
                  status: 'resolved' as const,
                  outcome: 'upheld' as const,
                  resolvedAt: trx.fn.now(),
                }

          const [updatedCase] = await trx<ModerationCase>('moderation_case')
            .where({ id: moderationCase.id })
            .update({
              ...next,
              updatedAt: trx.fn.now(),
            })
            .returning('*')

          await this.createCommunityWatchModerationEvent(trx, {
            moderationCase,
            eventType:
              event.eventType === 'appeal_received' ? 'appealed' : 'reviewed',
            actorType: 'admin',
            actorId,
            fromStatus: moderationCase.status,
            toStatus: next.status,
            fromOutcome: moderationCase.outcome,
            toOutcome:
              'outcome' in next
                ? (next.outcome as ModerationCaseOutcome)
                : moderationCase.outcome,
            publicReason: action.reason,
            internalNote: note,
            metadata: {
              ...this.toCommunityWatchModerationMetadata(action),
              communityWatchEvent: event.eventType,
              oldValue: event.oldValue,
              newValue: event.newValue,
            },
          })

          moderationCase = updatedCase
        }
      })
    } catch (error) {
      logger.error(error)
    }
  }

  private syncCommunityWatchModerationCaseRestored = async ({
    previousAction,
    action,
    actorId,
    note,
  }: {
    previousAction: CommunityWatchAction
    action: CommunityWatchAction
    actorId: string
    note?: string | null
  }) => {
    try {
      await this.knex.transaction(async (trx) => {
        const moderationCase =
          await this.resolveCommunityWatchModerationCaseForAction(trx, {
            previousAction,
            action,
          })

        await trx('moderation_case').where({ id: moderationCase.id }).update({
          status: 'resolved',
          outcome: 'restored',
          resolvedAt: trx.fn.now(),
          updatedAt: trx.fn.now(),
        })

        await this.createCommunityWatchModerationEvent(trx, {
          moderationCase,
          eventType: 'restored',
          actorType: 'admin',
          actorId,
          fromStatus: moderationCase.status,
          toStatus: 'resolved',
          fromOutcome: moderationCase.outcome,
          toOutcome: 'restored',
          publicReason: action.reason,
          internalNote: note,
          metadata: this.toCommunityWatchModerationMetadata(action),
        })
      })
    } catch (error) {
      logger.error(error)
    }
  }

  public syncCommunityWatchModerationCaseNoticeSent = async ({
    action,
  }: {
    action: CommunityWatchAction
  }) => {
    try {
      await this.knex.transaction(async (trx) => {
        const moderationCase =
          await this.resolveCommunityWatchModerationCaseForAction(trx, {
            previousAction: action,
            action,
          })

        await trx('moderation_case').where({ id: moderationCase.id }).update({
          noticeState: 'sent',
          updatedAt: trx.fn.now(),
        })

        await this.createCommunityWatchModerationEvent(trx, {
          moderationCase,
          eventType: 'notified',
          actorType: 'system',
          publicReason: action.reason,
          metadata: this.toCommunityWatchModerationMetadata(action),
        })
      })
    } catch (error) {
      logger.error(error)
    }
  }

  private resolveCommunityWatchModerationCaseForAction = async (
    trx: Knex.Transaction,
    {
      previousAction,
      action,
    }: {
      previousAction: CommunityWatchAction
      action: CommunityWatchAction
    }
  ): Promise<ModerationCase> => {
    const previousBase = this.toCommunityWatchModerationCaseBase(previousAction)
    const currentBase = this.toCommunityWatchModerationCaseBase(action)

    const previousCase = await trx<ModerationCase>('moderation_case')
      .where(previousBase)
      .first()

    if (previousCase && previousAction.reason !== action.reason) {
      const existingCurrentCase = await trx<ModerationCase>('moderation_case')
        .where(currentBase)
        .first()

      if (existingCurrentCase) {
        return existingCurrentCase
      }

      const [updatedCase] = await trx<ModerationCase>('moderation_case')
        .where({ id: previousCase.id })
        .update({
          reason: action.reason,
          publicReason: action.reason,
          updatedAt: trx.fn.now(),
        })
        .returning('*')
      return updatedCase
    }

    if (previousCase) {
      return previousCase
    }

    const { moderationCase } =
      await this.findOrCreateCommunityWatchModerationCase(trx, action)
    return moderationCase
  }

  private findOrCreateCommunityWatchModerationCase = async (
    trx: Knex.Transaction,
    action: CommunityWatchAction
  ): Promise<{ moderationCase: ModerationCase; created: boolean }> => {
    const base = this.toCommunityWatchModerationCaseBase(action)
    const [inserted] = await trx<ModerationCase>('moderation_case')
      .insert({
        ...base,
        primaryReporterId: action.actorId,
        publicReason: action.reason,
        status: 'received',
        automationRole: 'none',
        noticeState: 'pending',
      })
      .onConflict(['source', 'targetType', 'targetId', 'reason'])
      .ignore()
      .returning('*')

    if (inserted) {
      return { moderationCase: inserted, created: true }
    }

    const moderationCase = await trx<ModerationCase>('moderation_case')
      .where(base)
      .first()
    if (!moderationCase) {
      throw new Error(
        'failed to create or load Community Watch moderation case'
      )
    }

    return { moderationCase, created: false }
  }

  private toCommunityWatchModerationCaseBase = (
    action: CommunityWatchAction
  ) => ({
    source: 'community_watch' as const,
    targetType: 'comment' as const,
    targetId: action.commentId,
    reason: action.reason,
  })

  private toCommunityWatchModerationMetadata = (
    action: CommunityWatchAction
  ) => ({
    communityWatchActionId: action.id,
    communityWatchActionUuid: action.uuid,
    actionState: action.actionState,
    appealState: action.appealState,
    reviewState: action.reviewState,
  })

  private createCommunityWatchModerationEvent = async (
    trx: Knex.Transaction,
    {
      moderationCase,
      eventType,
      actorType,
      actorId,
      publicReason,
      internalNote,
      fromStatus,
      toStatus,
      fromOutcome,
      toOutcome,
      metadata,
    }: {
      moderationCase: ModerationCase
      eventType: ModerationEventType
      actorType: ModerationActorType
      actorId?: string | null
      publicReason?: string | null
      internalNote?: string | null
      fromStatus?: ModerationCaseStatus | null
      toStatus?: ModerationCaseStatus | null
      fromOutcome?: ModerationCaseOutcome | null
      toOutcome?: ModerationCaseOutcome | null
      metadata?: Record<string, unknown> | null
    }
  ) =>
    trx('moderation_event').insert({
      caseId: moderationCase.id,
      eventType,
      actorType,
      actorId,
      publicReason,
      internalNote,
      fromStatus,
      toStatus,
      fromOutcome,
      toOutcome,
      metadata,
    })

  /**
   * Count comments by a given id and comment type.
   *
   * @remarks only count active and collapsed comments
   */
  public count = async (
    targetId: string,
    type: ValueOf<typeof COMMENT_TYPE>
  ) => {
    const result = await this.knexRO(this.table)
      .where({
        targetId,
        type,
      })
      .whereIn('state', [COMMENT_STATE.active, COMMENT_STATE.collapsed])
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find comments by a given comment id.
   *
   * @remarks only find active and collapsed comments
   */
  public findByParent = async ({
    id,
    author,
    sort,
    skip,
    take,
  }: GQLCommentCommentsInput & {
    id: string
    skip?: number
    take?: number
  }): Promise<[Comment[], number]> => {
    let where: { [key: string]: string | boolean } = {
      parentCommentId: id,
    }

    let query = null
    const sortCreatedAt = (by: 'desc' | 'asc') =>
      this.knexRO
        .select(['*', this.knex.raw('count(1) OVER() AS total_count')])
        .from(this.table)
        .where(where)
        .andWhere((builder) => {
          builder
            .whereIn('state', [COMMENT_STATE.active, COMMENT_STATE.collapsed])
            .orWhere((communityWatchBuilder) => {
              communityWatchBuilder
                .where({ state: COMMENT_STATE.banned })
                .andWhere(
                  this.knexRO.raw(
                    'EXISTS (SELECT 1 FROM community_watch_action WHERE community_watch_action.comment_id = comment.id AND community_watch_action.action_state = ?)',
                    ['active']
                  )
                )
            })
        })
        .orderBy('created_at', by)

    if (author) {
      where = { ...where, authorId: author }
    }

    if (sort === 'oldest') {
      query = sortCreatedAt('asc')
    } else if (sort === 'newest') {
      query = sortCreatedAt('desc')
    } else {
      query = sortCreatedAt('desc')
    }

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }
    const records = await query

    return [records, records[0] ? parseInt(records[0].totalCount, 10) : 0]
  }

  /**
   * Find comments.
   */
  public find = async ({
    order = 'desc',
    where,
    after,
    first,
    before,
    includeAfter = false,
    includeBefore = false,
  }: GQLCommentsInput & { where: CommentFilter; order?: string }): Promise<
    [Comment[], number]
  > => {
    const subQuery = this.knexRO
      .select(this.knexRO.raw('COUNT(id) OVER() AS total_count'), '*')
      .fromRaw('comment AS outer_comment')
      .where(where)
      .andWhere((andWhereBuilder) => {
        // filter archived/banned comments when `where.state` params is not specified
        // and where.parent_comment_id is specified
        // as we don't want to show archived/banned comments for normal users, but not the case in oss
        if (!('state' in where) && 'parentCommentId' in where) {
          andWhereBuilder
            .where({ state: COMMENT_STATE.active })
            .orWhere({ state: COMMENT_STATE.collapsed })
            .orWhere((orWhereBuilder) => {
              orWhereBuilder
                .where({ state: COMMENT_STATE.banned })
                .andWhere(
                  this.knexRO.raw(
                    'EXISTS (SELECT 1 FROM community_watch_action WHERE community_watch_action.comment_id = outer_comment.id AND community_watch_action.action_state = ?)',
                    ['active']
                  )
                )
            })
            .orWhere((orWhereBuilder) => {
              orWhereBuilder.andWhere(
                this.knexRO.raw(
                  '(SELECT COUNT(1) FROM comment WHERE state in (?, ?) and parent_comment_id = outer_comment.id)',
                  [COMMENT_STATE.active, COMMENT_STATE.collapsed]
                ),
                '>',
                0
              )
            })
        }
      })
      .orderBy('created_at', order)

    const query = this.knexRO.from(subQuery.as('t1'))

    if (after) {
      if (includeAfter) {
        query.andWhere('id', order === 'asc' ? '>=' : '<=', after)
      } else {
        query.andWhere('id', order === 'asc' ? '>' : '<', after)
      }
    }
    if (before) {
      if (includeBefore) {
        query.andWhere('id', order === 'asc' ? '<=' : '>=', before)
      } else {
        query.andWhere('id', order === 'asc' ? '<' : '>', before)
      }
    }
    if (first) {
      query.limit(first)
    }
    const records = await query
    return [records, +records[0]?.totalCount || 0]
  }

  /**
   * Find commented followees by a given comment target.
   *
   * @remarks target author (like moment author) is excluded if provided
   */
  public findCommentedFollowees = async (
    target: {
      id: string
      authorId: string
      type: ValueOf<typeof COMMENT_TYPE>
    },
    userId: string,
    take = 3
  ) => {
    const records = await this.knexRO
      .select(
        'user.id',
        this.knexRO.raw('MIN(comment.created_at) AS comment_created_at')
      )
      .from('comment')
      .join('action_user', 'comment.author_id', 'action_user.target_id')
      .join('user', 'comment.author_id', 'user.id')
      .where({
        'comment.target_id': target.id,
        'comment.type': target.type,
        'action_user.user_id': userId,
        'comment.state': COMMENT_STATE.active,
        'user.state': USER_STATE.active,
      })
      .where('comment.author_id', '!=', target.authorId)
      .groupBy('user.id')
      .orderBy('comment_created_at', 'asc')
      .limit(take)

    return this.models.userIdLoader.loadMany(
      records.map(({ id }: { id: string }) => id)
    )
  }

  /*********************************
   *                               *
   *              Vote             *
   *                               *
   *********************************/
  public upvote = async ({
    user,
    comment,
  }: {
    user: User
    comment: Comment
  }) => {
    if (!user.userName) {
      throw new ForbiddenError('user has no username')
    }

    if (user.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(`${user.state} user has no permission`)
    }

    // check target
    let article: Article
    let circle: Circle | undefined = undefined
    let campaign: Campaign | undefined = undefined
    let targetAuthorId: string | undefined
    if (comment.type === COMMENT_TYPE.article) {
      article = await this.models.articleIdLoader.load(comment.targetId)
      targetAuthorId = article.authorId
    } else if (comment.type === COMMENT_TYPE.moment) {
      const moment = await this.models.momentIdLoader.load(comment.targetId)
      targetAuthorId = moment.authorId
    } else if (comment.type === COMMENT_TYPE.campaignDiscussion) {
      // campaign discussion has no single target author
      campaign = await this.models.campaignIdLoader.load(comment.targetId)
    } else {
      circle = await this.models.circleIdLoader.load(comment.targetId)
      targetAuthorId = circle.owner
    }

    if (targetAuthorId) {
      const userService = new UserService(this.connections)
      const isBlocked = await userService.blocked({
        userId: targetAuthorId,
        targetId: user.id,
      })
      if (isBlocked) {
        throw new ForbiddenError('blocked user has no permission')
      }
    }

    // check permission
    const isTargetAuthor = targetAuthorId === user.id

    if (circle && !isTargetAuthor) {
      const paymentService = new PaymentService(this.connections)
      const isCircleMember = await paymentService.isCircleMember({
        userId: user.id,
        circleId: circle.id,
      })

      if (!isCircleMember) {
        throw new ForbiddenError('only circle members have the permission')
      }
    }

    if (campaign) {
      const campaignService = new CampaignService(this.connections)
      const isParticipant = await campaignService.isParticipant(
        campaign.id,
        user.id
      )
      const isOrganizer =
        campaign.creatorId === user.id ||
        (campaign.organizerIds ?? []).includes(user.id) ||
        (campaign.managerIds ?? []).includes(user.id)

      if (!isParticipant && !isOrganizer) {
        throw new ForbiddenError(
          'only campaign participants have the permission'
        )
      }
    }

    // check is voted before
    const voted = await this.findVotesByUserId({
      userId: user.id,
      commentId: comment.id,
    })
    if (voted && voted.length > 0) {
      await this.removeVotesByUserId({
        userId: user.id,
        commentId: comment.id,
      })
    }

    const action = await this.models.create({
      table: 'action_comment',
      data: {
        userId: user.id,
        targetId: comment.id,
        action: 'up_vote' as const,
      },
    })

    // notification
    if (
      [COMMENT_TYPE.article as string, COMMENT_TYPE.moment as string].includes(
        comment.type
      )
    ) {
      const noticeType =
        comment.type === COMMENT_TYPE.moment
          ? NOTICE_TYPE.moment_comment_liked
          : NOTICE_TYPE.article_comment_liked

      const notificationService = new NotificationService(this.connections)
      notificationService.trigger({
        event: noticeType,
        actorId: user.id,
        recipientId: comment.authorId,
        entities: [{ type: 'target', entityTable: 'comment', entity: comment }],
        tag: `${noticeType}:${user.id}:${comment.id}`,
      })
    }

    return action
  }

  public unvote = async ({
    userId,
    commentId,
  }: {
    userId: string
    commentId: string
  }) =>
    this.knex('action_comment')
      .where({
        userId,
        targetId: commentId,
      })
      .del()

  /**
   * Count a comment's up votes by a given target id (comment).
   */
  public countUpVote = async (targetId: string) => {
    const result = await this.knex('action_comment')
      .where({
        targetId,
        action: USER_ACTION.upVote,
      })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Count a comment's down votes by a given target id (comment).
   */
  public countDownVote = async (targetId: string) => {
    const result = await this.knex('action_comment')
      .where({
        target_id: targetId,
        action: USER_ACTION.downVote,
      })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find a comment's votes by a given target id (comment).
   */
  public findVotesByUserId = async ({
    userId,
    commentId: targetId,
  }: {
    userId: string
    commentId: string
  }) =>
    this.knex
      .select()
      .from('action_comment')
      .where({
        userId,
        targetId,
      })
      .whereIn('action', [USER_ACTION.upVote, USER_ACTION.downVote])

  /**
   * Remove a comment's votes a given target id (comment).
   */
  public removeVotesByUserId = async ({
    userId,
    commentId: targetId,
  }: {
    userId: string
    commentId: string
  }) =>
    this.knex
      .select()
      .from('action_comment')
      .where({
        userId,
        targetId,
      })
      .whereIn('action', [USER_ACTION.upVote, USER_ACTION.downVote])
      .del()

  /*********************************
   *                               *
   *              Pin              *
   *                               *
   *********************************/
  /**
   * Find pinned comments by a given article id.
   */
  private countPinnedByArticle = async ({
    articleId,
    activeOnly,
  }: {
    articleId: string
    activeOnly?: boolean
  }) => {
    const query = this.knex(this.table)
      .count()
      .where({ targetId: articleId, pinned: true })
      .first()

    if (activeOnly) {
      query.where({
        state: COMMENT_STATE.active,
        type: COMMENT_TYPE.article,
      })
    }

    const result = await query
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public pinLeftByArticle = async (articleId: string) => {
    const pinnedCount = await this.countPinnedByArticle({
      articleId,
      activeOnly: true,
    })
    return Math.max(ARTICLE_PIN_COMMENT_LIMIT - pinnedCount, 0)
  }

  public addCommentCountColumn = async (articlesQuery: Knex.QueryBuilder) => {
    const column = 'comment_count'
    const knex = articlesQuery.client.queryBuilder()
    const { id: targetTypeId } = await this.baseFindEntityTypeId('article')
    return {
      query: knex
        .clone()
        .from(articlesQuery.clone().as('t1'))
        .leftJoin(
          knex
            .clone()
            .from('comment')
            .where({
              type: COMMENT_TYPE.article,
              state: COMMENT_STATE.active,
              targetTypeId,
            })
            .groupBy('target_id')
            .select('target_id', knex.client.raw('COUNT(1) as ??', [column]))
            .as('t2'),
          't1.id',
          't2.target_id'
        )
        .select(
          't1.*',
          knex.client.raw('COALESCE(t2.??, 0) as ??', [column, column])
        ),
      column,
    }
  }

  public addNotAuthorCommentCountColumn = async (
    articlesQuery: Knex.QueryBuilder,
    { start }: { start?: Date } = {}
  ) => {
    const column = 'not_author_comment_count'
    const knex = articlesQuery.client.queryBuilder()
    const { id: targetTypeId } = await this.baseFindEntityTypeId('article')
    const commentCountQuery = knex
      .clone()
      .from(
        knex
          .clone()
          .from('comment')
          .where({
            type: COMMENT_TYPE.article,
            state: COMMENT_STATE.active,
            targetTypeId,
          })
          .modify((query) => {
            if (start) {
              query.where('created_at', '>=', start)
            }
          })
          .as('comment')
      )
      .leftJoin('article', 'comment.target_id', 'article.id')
      .whereRaw('article.author_id != comment.author_id')
      .groupBy('article.id')
      .select(
        'article.id',
        knex.client.raw('COALESCE(COUNT(1), 0) as ??', [column])
      )
    return {
      query: knex
        .clone()
        .from(articlesQuery.clone().as('article'))
        .leftJoin(
          commentCountQuery.as('comment_count'),
          'article.id',
          'comment_count.id'
        )
        .select(
          'article.*',
          knex.client.raw('COALESCE(comment_count.??, 0) as ??', [
            column,
            column,
          ])
        ),
      column,
    }
  }

  public detectSpam = async ({
    id,
    content,
  }: {
    id: string
    content: string
  }) => {
    // Comments use their own model (separate from short-content/moments). Until
    // MATTERS_COMMENT_SPAM_DETECTION_API_URL is configured, fall back to the
    // short-content model so behaviour is unchanged.
    const detector = new SpamDetector(
      environment.commentSpamDetectionApiUrl ||
        environment.shortContentSpamDetectionApiUrl
    )
    const score = await detector.detect(content)

    if (score) {
      await this.models.update({
        table: 'comment',
        where: { id },
        data: { spamScore: score },
      })
      if (environment.commentSpamAlert) {
        await this._alertSpamIfHighScore(id, score, content)
      }
      if (environment.commentSpamAutoCollapse) {
        await this._autoCollapseIfSpam(id, score)
      }
    }
    return score
  }

  /**
   * Classify a high-scoring comment into a moderation tier and surface it to the
   * admin Telegram chat. NOTIFY-ONLY — this never hides a comment (auto-action
   * lives in `_autoCollapseIfSpam`, gated separately). Gated by
   * `commentSpamAlert`; a no-op when the env flag is off.
   *
   *   Tier A (auto):   contact + solicitation  → blatant porn/escort/commercial.
   *   Tier B (ring):   author repeats near-identical content >= RING_MIN_FAMILY.
   *   Tier C (review): high score but neither   → human confirms (likely benign).
   *
   * See commentSpamSignals.ts for why score alone is insufficient.
   */
  private _alertSpamIfHighScore = async (
    id: string,
    score: number,
    content: string
  ) => {
    const systemService = new SystemService(this.connections)
    const threshold = await systemService.getSpamThreshold()
    const contentTier = classifyContentTier({ score, content, threshold })
    if (!contentTier) {
      return
    }

    const comment = await this.models.commentIdLoader.load(id)
    if (!comment) {
      return
    }

    // Tier B takes precedence: a confirmed ring is acted on regardless of the
    // content-only tier (rings are what per-comment content scoring misses).
    const isRing = await this._isAuthorRepeating(comment.authorId, content, id)
    const tier: CommentSpamTier = isRing ? 'ring' : contentTier

    const author = await this.models.userIdLoader.load(comment.authorId)
    const snippet = stripHtml(content).slice(0, 80)
    const globalId = toGlobalId({ type: NODE_TYPES.Comment, id })
    await enqueueReportAlert({
      source: 'spam_detection',
      dedupeKey: `comment:${id}`,
      subject: `留言 @${author?.userName ?? comment.authorId}（${score.toFixed(
        2
      )}）：${snippet}`,
      reason: TIER_REASON[tier],
      ossUrl: `${environment.ossSiteDomain}/comments?id=${encodeURIComponent(
        globalId
      )}`,
    })
  }

  /**
   * Tier B signal: does this author have >= RING_MIN_FAMILY other recent
   * comments whose content is near-identical to this one? Bounded to the
   * author's last 100 comments in 30 days so the per-comment cost stays small
   * (only runs for the rare high-score comments).
   */
  private _isAuthorRepeating = async (
    authorId: string,
    content: string,
    excludeId: string
  ): Promise<boolean> => {
    if (normalizeForDup(content).length < 8) {
      return false
    }
    const rows = await this.knexRO('comment')
      .select('content')
      .where('author_id', authorId)
      .whereNot('id', excludeId)
      .andWhere(
        'created_at',
        '>',
        this.knexRO.raw("now() - interval '30 days'")
      )
      .orderBy('id', 'desc')
      .limit(100)
    let similar = 0
    for (const row of rows) {
      if (nearDuplicate(content, row.content || '')) {
        similar++
        if (similar >= RING_MIN_FAMILY) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Collapse an active comment whose spam score reaches the system spam
   * threshold. Collapse (not deletion) keeps the comment foldable in-thread —
   * "不刪除，只是不再被看見". Mirrors article demotion: respects the
   * `bypassSpamDetection` whitelist and the tunable system threshold. Gated by
   * `commentSpamAutoCollapse`; a no-op when the env flag is off.
   */
  private _autoCollapseIfSpam = async (id: string, score: number) => {
    const systemService = new SystemService(this.connections)
    const spamThreshold = await systemService.getSpamThreshold()
    if (!spamThreshold || score < spamThreshold) {
      return
    }

    const comment = await this.models.commentIdLoader.load(id)
    if (!comment || comment.state !== COMMENT_STATE.active) {
      return
    }

    const whitelisted = await this.models.findFirst({
      table: 'user_feature_flag',
      where: {
        userId: comment.authorId,
        type: USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
      },
    })
    if (whitelisted) {
      return
    }

    await this.models.update({
      table: 'comment',
      where: { id },
      data: { state: COMMENT_STATE.collapsed },
    })
  }
}
