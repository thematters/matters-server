import type {
  Comment,
  GQLCommunityWatchRemoveCommentReason,
  GQLMutationResolvers,
} from '#definitions/index.js'

import { jest } from '@jest/globals'

import {
  COMMENT_STATE,
  COMMENT_TYPE,
  NODE_TYPES,
  OFFICIAL_NOTICE_EXTEND_TYPE,
  USER_FEATURE_FLAG_TYPE,
  USER_STATE,
} from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import communityWatchRemoveComment from '#mutations/comment/communityWatchRemoveComment.js'

const mutation = communityWatchRemoveComment as NonNullable<
  GQLMutationResolvers['communityWatchRemoveComment']
>

const baseComment: Comment = {
  id: '101',
  uuid: 'comment-uuid',
  authorId: '1',
  articleId: null,
  articleVersionId: null,
  parentCommentId: null,
  content: '<p>spam</p>',
  state: COMMENT_STATE.active,
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
  createdAt: new Date('2026-05-10T00:00:00.000Z'),
  updatedAt: new Date('2026-05-10T00:00:00.000Z'),
}

const createContext = ({
  comment = baseComment,
  lockedComment = comment,
  activeAction,
  featureFlags = [{ type: USER_FEATURE_FLAG_TYPE.communityWatch }],
  viewerState = USER_STATE.active,
}: {
  comment?: Comment
  lockedComment?: Comment | null
  activeAction?: { id: string }
  featureFlags?: Array<{ type: string }>
  viewerState?: string
} = {}) => {
  const insertedActions: any[] = []
  const commentUpdates: any[] = []
  const updatedComment = { ...lockedComment, state: COMMENT_STATE.banned }

  const createBuilder = (table: string) => {
    const builder: any = {
      select: () => builder,
      where: () => builder,
      forUpdate: () => builder,
      first: async () => {
        if (table === 'community_watch_action') {
          return activeAction
        }
        if (table === 'comment') {
          return lockedComment
        }
        return undefined
      },
      insert: async (data: any) => {
        insertedActions.push(data)
      },
      update: (data: any) => {
        commentUpdates.push(data)
        return builder
      },
      returning: async () => [updatedComment],
    }
    return builder
  }

  const trx = ((table: string) => createBuilder(table)) as any
  const context = {
    viewer: {
      id: '2',
      state: viewerState,
    },
    dataSources: {
      atomService: {
        commentIdLoader: { load: async () => comment },
        articleIdLoader: {
          load: async () => ({
            id: comment.targetId,
            shortHash: 'article-hash',
          }),
        },
        momentIdLoader: {
          load: async () => ({
            id: comment.targetId,
            shortHash: 'moment-hash',
          }),
        },
      },
      articleService: {
        loadLatestArticleVersion: async () => ({ title: 'Article title' }),
      },
      userService: {
        findFeatureFlags: async () => featureFlags,
      },
      notificationService: {
        trigger: jest.fn(),
      },
      connections: {
        knex: {
          transaction: async (callback: (trx: any) => Promise<any>) =>
            callback(trx),
        },
        redis: {
          smembers: async () => [],
        },
      },
    },
  } as any

  return { context, insertedActions, commentUpdates }
}

const removeComment = (
  context: any,
  id = baseComment.id,
  reason: GQLCommunityWatchRemoveCommentReason = 'porn_ad'
) =>
  mutation(
    {},
    {
      input: {
        id: toGlobalId({ type: NODE_TYPES.Comment, id }),
        reason,
      },
    },
    context,
    {} as any
  )

describe('communityWatchRemoveComment', () => {
  test('removes an article comment and writes an audit action', async () => {
    const { context, insertedActions, commentUpdates } = createContext()

    const result = await mutation(
      {},
      {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: baseComment.id }),
          reason: 'porn_ad',
        },
      },
      context,
      {} as any
    )

    expect(result.state).toBe(COMMENT_STATE.banned)
    expect(commentUpdates).toEqual([
      expect.objectContaining({ state: COMMENT_STATE.banned }),
    ])
    expect(insertedActions[0]).toEqual(
      expect.objectContaining({
        commentId: baseComment.id,
        commentType: COMMENT_TYPE.article,
        targetType: COMMENT_TYPE.article,
        targetTitle: 'Article title',
        targetShortHash: 'article-hash',
        reason: 'porn_ad',
        actorId: '2',
        commentAuthorId: '1',
        originalContent: '<p>spam</p>',
        originalState: COMMENT_STATE.active,
      })
    )
    expect(insertedActions[0].contentExpiresAt.getTime()).toBeGreaterThan(
      insertedActions[0].createdAt.getTime()
    )
    expect(
      context.dataSources.notificationService.trigger
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        event: OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned,
        recipientId: baseComment.authorId,
      })
    )
  })

  test('removes a moment comment without an article title', async () => {
    const comment = {
      ...baseComment,
      type: COMMENT_TYPE.moment,
      targetId: '12',
    }
    const { context, insertedActions } = createContext({ comment })

    await mutation(
      {},
      {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
          reason: 'spam_ad',
        },
      },
      context,
      {} as any
    )

    expect(insertedActions[0]).toEqual(
      expect.objectContaining({
        commentType: COMMENT_TYPE.moment,
        targetType: COMMENT_TYPE.moment,
        targetTitle: null,
        targetShortHash: 'moment-hash',
        reason: 'spam_ad',
      })
    )
  })

  test('rejects users without the communityWatch feature flag', async () => {
    const { context } = createContext({ featureFlags: [] })

    await expect(removeComment(context)).rejects.toHaveProperty(
      'extensions.code',
      'FORBIDDEN'
    )
  })

  test('rejects archived users before loading the comment', async () => {
    const { context } = createContext({ viewerState: USER_STATE.archived })

    await expect(removeComment(context)).rejects.toHaveProperty(
      'extensions.code',
      'FORBIDDEN_BY_STATE'
    )
  })

  test('rejects non-comment targets', async () => {
    const { context } = createContext()

    await expect(
      mutation(
        {},
        {
          input: {
            id: toGlobalId({ type: NODE_TYPES.Article, id: '1' }),
            reason: 'porn_ad',
          },
        },
        context,
        {} as any
      )
    ).rejects.toHaveProperty('extensions.code', 'BAD_USER_INPUT')
  })

  test('rejects circle comments before changing state', async () => {
    const circleComment = {
      ...baseComment,
      type: COMMENT_TYPE.circleDiscussion,
    }
    const { context, commentUpdates } = createContext({
      comment: circleComment,
    })

    await expect(removeComment(context)).rejects.toHaveProperty(
      'extensions.code',
      'BAD_USER_INPUT'
    )
    expect(commentUpdates).toHaveLength(0)
  })

  test('rejects comments that already have an active audit action', async () => {
    const { context } = createContext({ activeAction: { id: '1' } })

    await expect(
      removeComment(context, baseComment.id, 'spam_ad')
    ).rejects.toHaveProperty('extensions.code', 'BAD_USER_INPUT')
  })

  test('rejects comments missing during the locked update', async () => {
    const { context } = createContext({ lockedComment: null })

    await expect(removeComment(context)).rejects.toHaveProperty(
      'extensions.code',
      'COMMENT_NOT_FOUND'
    )
  })

  test('rejects unsupported locked comment types', async () => {
    const { context } = createContext({
      lockedComment: {
        ...baseComment,
        type: COMMENT_TYPE.circleBroadcast,
      },
    })

    await expect(removeComment(context)).rejects.toHaveProperty(
      'extensions.code',
      'BAD_USER_INPUT'
    )
  })

  test('rejects locked comments that are no longer removable', async () => {
    const { context } = createContext({
      lockedComment: {
        ...baseComment,
        state: COMMENT_STATE.banned,
      },
    })

    await expect(removeComment(context)).rejects.toHaveProperty(
      'extensions.code',
      'BAD_USER_INPUT'
    )
  })
})
