import type { Comment, CommunityWatchAction } from '#definitions/index.js'

import { jest } from '@jest/globals'

import {
  COMMENT_STATE,
  COMMENT_TYPE,
} from '#common/enums/index.js'
import { CommentService } from '#connectors/commentService.js'
import clearCommunityWatchOriginalContent from '#mutations/comment/clearCommunityWatchOriginalContent.js'
import restoreCommunityWatchComment from '#mutations/comment/restoreCommunityWatchComment.js'
import updateCommunityWatchActionState from '#mutations/comment/updateCommunityWatchActionState.js'

const clearMutation = clearCommunityWatchOriginalContent as any
const restoreMutation = restoreCommunityWatchComment as any
const updateMutation = updateCommunityWatchActionState as any

const baseAction: CommunityWatchAction = {
  id: '501',
  uuid: 'cw-action-uuid',
  commentId: '101',
  commentType: COMMENT_TYPE.article,
  targetType: COMMENT_TYPE.article,
  targetId: '11',
  targetTitle: 'Article title',
  targetShortHash: 'article-hash',
  reason: 'porn_ad',
  actorId: '2',
  commentAuthorId: '1',
  originalContent: '<p>spam</p>',
  originalState: COMMENT_STATE.active,
  actionState: 'active',
  appealState: 'none',
  reviewState: 'pending',
  reviewerId: null,
  reviewNote: null,
  reviewedAt: null,
  contentExpiresAt: new Date('2026-05-18T00:00:00.000Z'),
  createdAt: new Date('2026-05-11T00:00:00.000Z'),
  updatedAt: new Date('2026-05-11T00:00:00.000Z'),
}

const baseComment: Comment = {
  id: '101',
  uuid: 'comment-uuid',
  authorId: '1',
  articleId: null,
  articleVersionId: null,
  parentCommentId: null,
  content: '<p>spam</p>',
  state: COMMENT_STATE.banned,
  pinned: false,
  quotationStart: null,
  quotationEnd: null,
  quotationContent: null,
  replyTo: null,
  remark: null,
  targetId: '11',
  targetTypeId: '1',
  type: COMMENT_TYPE.article,
  pinnedAt: null,
  spamScore: null,
  isSpam: null,
  createdAt: new Date('2026-05-11T00:00:00.000Z'),
  updatedAt: new Date('2026-05-11T00:00:00.000Z'),
}

const createService = ({
  action = baseAction,
  comment = baseComment,
}: {
  action?: CommunityWatchAction | null
  comment?: Comment | null
} = {}) => {
  const actionUpdates: any[] = []
  const commentUpdates: any[] = []
  const eventInserts: any[] = []

  const createBuilder = (table: string) => {
    const builder: any = {
      select: () => builder,
      where: () => builder,
      forUpdate: () => builder,
      first: async () => {
        if (table === 'community_watch_action') {
          return action
        }
        if (table === 'comment') {
          return comment
        }
        return undefined
      },
      update: (data: any) => {
        if (table === 'community_watch_action') {
          actionUpdates.push(data)
        }
        if (table === 'comment') {
          commentUpdates.push(data)
        }
        return builder
      },
      returning: async () => {
        if (table === 'community_watch_action') {
          return [{ ...action, ...actionUpdates.at(-1) }]
        }
        if (table === 'comment') {
          return [{ ...comment, ...commentUpdates.at(-1) }]
        }
        return []
      },
      insert: async (data: any) => {
        if (table === 'community_watch_review_event') {
          eventInserts.push(...data)
        }
      },
    }
    return builder
  }

  const trx = ((table: string) => createBuilder(table)) as any
  const knex = (() => createBuilder('')) as any
  knex.transaction = async (callback: (trx: any) => Promise<any>) =>
    callback(trx)

  const service = new CommentService({
    knex,
    knexRO: knex,
    knexSearch: knex,
    redis: {},
    objectCacheRedis: {},
  } as any)

  return { service, actionUpdates, commentUpdates, eventInserts }
}

const createMutationContext = ({
  isAdmin = true,
  commentService = {},
}: {
  isAdmin?: boolean
  commentService?: Record<string, unknown>
} = {}) =>
  ({
    viewer: {
      id: '9',
      hasRole: (role: string) => isAdmin && role === 'admin',
    },
    dataSources: {
      commentService,
      connections: { redis: { smembers: async () => [] } },
    },
  }) as any

describe('community watch staff review service', () => {
  test('updates appeal, review, and reason with review events', async () => {
    const { service, actionUpdates, eventInserts } = createService()

    const result = await service.updateCommunityWatchActionState({
      uuid: baseAction.uuid,
      actorId: '9',
      appealState: 'received',
      reviewState: 'upheld',
      reason: 'spam_ad',
      note: 'reviewed by staff',
    })

    expect(result.reason).toBe('spam_ad')
    expect(actionUpdates[0]).toEqual(
      expect.objectContaining({
        appealState: 'received',
        reviewState: 'upheld',
        reason: 'spam_ad',
        reviewerId: '9',
        reviewNote: 'reviewed by staff',
      })
    )
    expect(eventInserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'appeal_received',
          oldValue: 'none',
          newValue: 'received',
          actorId: '9',
        }),
        expect.objectContaining({
          eventType: 'review_upheld',
          oldValue: 'pending',
          newValue: 'upheld',
        }),
        expect.objectContaining({
          eventType: 'reason_changed',
          oldValue: 'porn_ad',
          newValue: 'spam_ad',
        }),
      ])
    )
  })

  test('restores the comment and marks the action as reversed', async () => {
    const { service, actionUpdates, commentUpdates, eventInserts } =
      createService()

    const result = await service.restoreCommunityWatchComment({
      uuid: baseAction.uuid,
      actorId: '9',
      note: 'appeal accepted',
    })

    expect(result.comment.state).toBe(COMMENT_STATE.active)
    expect(commentUpdates[0]).toEqual(
      expect.objectContaining({ state: COMMENT_STATE.active })
    )
    expect(actionUpdates[0]).toEqual(
      expect.objectContaining({
        actionState: 'restored',
        reviewState: 'reversed',
        reviewerId: '9',
      })
    )
    expect(eventInserts[0]).toEqual(
      expect.objectContaining({
        eventType: 'comment_restored',
        oldValue: COMMENT_STATE.banned,
        newValue: COMMENT_STATE.active,
      })
    )
  })

  test('requires the restore mutation for reversed review state', async () => {
    const { service } = createService()

    await expect(
      service.updateCommunityWatchActionState({
        uuid: baseAction.uuid,
        actorId: '9',
        reviewState: 'reversed',
      })
    ).rejects.toHaveProperty('extensions.code', 'BAD_USER_INPUT')
  })

  test('clears original content while keeping the audit row', async () => {
    const { service, actionUpdates, eventInserts } = createService()

    const result = await service.clearCommunityWatchOriginalContent({
      uuid: baseAction.uuid,
      actorId: '9',
      note: 'privacy request',
    })

    expect(result.originalContent).toBeNull()
    expect(actionUpdates[0]).toEqual(
      expect.objectContaining({
        originalContent: null,
        reviewerId: '9',
        reviewNote: 'privacy request',
      })
    )
    expect(eventInserts[0]).toEqual(
      expect.objectContaining({
        eventType: 'content_cleared',
        oldValue: 'present',
        newValue: null,
      })
    )
  })
})

describe('community watch staff review mutations', () => {
  test('requires admin permission for state updates', async () => {
    await expect(
      updateMutation(
        {},
        { input: { uuid: baseAction.uuid, appealState: 'received' } },
        createMutationContext({ isAdmin: false }),
        {} as any
      )
    ).rejects.toHaveProperty('extensions.code', 'FORBIDDEN')
  })

  test('passes the viewer and input to the state update service', async () => {
    const updateCommunityWatchActionStateService = jest
      .fn<any>()
      .mockResolvedValue(baseAction)
    const context = createMutationContext({
      commentService: {
        updateCommunityWatchActionState: updateCommunityWatchActionStateService,
      },
    })

    await updateMutation(
      {},
      {
        input: {
          uuid: baseAction.uuid,
          reason: 'spam_ad',
          note: 'wrong reason',
        },
      },
      context,
      {} as any
    )

    expect(updateCommunityWatchActionStateService).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: baseAction.uuid,
        actorId: '9',
        reason: 'spam_ad',
        note: 'wrong reason',
      })
    )
  })

  test('requires admin permission for restore and clear mutations', async () => {
    await expect(
      restoreMutation(
        {},
        { input: { uuid: baseAction.uuid } },
        createMutationContext({ isAdmin: false }),
        {} as any
      )
    ).rejects.toHaveProperty('extensions.code', 'FORBIDDEN')

    await expect(
      clearMutation(
        {},
        { input: { uuid: baseAction.uuid } },
        createMutationContext({ isAdmin: false }),
        {} as any
      )
    ).rejects.toHaveProperty('extensions.code', 'FORBIDDEN')
  })

  test('restores through the service and returns the updated action', async () => {
    const restoreCommunityWatchCommentService = jest
      .fn<any>()
      .mockResolvedValue({ action: baseAction, comment: baseComment })
    const context = createMutationContext({
      commentService: {
        restoreCommunityWatchComment: restoreCommunityWatchCommentService,
      },
    })

    const result = await restoreMutation(
      {},
      { input: { uuid: baseAction.uuid, note: 'appeal accepted' } },
      context,
      {} as any
    )

    expect(result).toBe(baseAction)
    expect(restoreCommunityWatchCommentService).toHaveBeenCalledWith({
      uuid: baseAction.uuid,
      actorId: '9',
      note: 'appeal accepted',
    })
  })

  test('clears original content through the service', async () => {
    const clearCommunityWatchOriginalContentService = jest
      .fn<any>()
      .mockResolvedValue({ ...baseAction, originalContent: null })
    const context = createMutationContext({
      commentService: {
        clearCommunityWatchOriginalContent:
          clearCommunityWatchOriginalContentService,
      },
    })

    const result = await clearMutation(
      {},
      { input: { uuid: baseAction.uuid, note: 'privacy request' } },
      context,
      {} as any
    )

    expect(result.originalContent).toBeNull()
    expect(clearCommunityWatchOriginalContentService).toHaveBeenCalledWith({
      uuid: baseAction.uuid,
      actorId: '9',
      note: 'privacy request',
    })
  })
})
