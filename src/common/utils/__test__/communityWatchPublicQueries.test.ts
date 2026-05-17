import type { CommunityWatchAction } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import communityWatchActionPublic from '#queries/comment/communityWatchActionPublic.js'
import communityWatchActionsResolver from '#queries/comment/communityWatchActions.js'
import rootCommunityWatchActionResolver from '#queries/comment/rootCommunityWatchAction.js'

const communityWatchActions = communityWatchActionsResolver as any
const rootCommunityWatchAction = rootCommunityWatchActionResolver as any

const actions: CommunityWatchAction[] = [
  {
    id: '2',
    uuid: 'action-2',
    commentId: '102',
    commentType: 'moment',
    targetType: 'moment',
    targetId: '202',
    targetTitle: null,
    targetShortHash: 'moment-hash',
    reason: 'spam_ad',
    actorId: '2',
    commentAuthorId: '8',
    originalContent: null,
    originalState: 'active',
    actionState: 'active',
    appealState: 'none',
    reviewState: 'pending',
    reviewerId: null,
    reviewNote: null,
    reviewedAt: null,
    contentExpiresAt: new Date('2026-05-17T00:00:00.000Z'),
    createdAt: new Date('2026-05-11T00:00:00.000Z'),
    updatedAt: new Date('2026-05-11T00:00:00.000Z'),
  },
  {
    id: '1',
    uuid: 'action-1',
    commentId: '101',
    commentType: 'article',
    targetType: 'article',
    targetId: '201',
    targetTitle: 'Article title',
    targetShortHash: 'article-hash',
    reason: 'porn_ad',
    actorId: '1',
    commentAuthorId: '7',
    originalContent: '<p>spam</p>',
    originalState: 'collapsed',
    actionState: 'active',
    appealState: 'received',
    reviewState: 'upheld',
    reviewerId: '9',
    reviewNote: null,
    reviewedAt: new Date('2026-05-12T00:00:00.000Z'),
    contentExpiresAt: new Date('2026-05-17T00:00:00.000Z'),
    createdAt: new Date('2026-05-10T00:00:00.000Z'),
    updatedAt: new Date('2026-05-12T00:00:00.000Z'),
  },
]

const filterActions = (filter: Record<string, string | null | undefined>) =>
  actions.filter((row) =>
    (['reason', 'actionState', 'appealState', 'reviewState'] as const).every(
      (key) => !filter[key] || row[key] === filter[key]
    )
  )

const createContext = () =>
  ({
    dataSources: {
      commentService: {
        findCommunityWatchActions: async ({
          filter,
          skip,
          take,
        }: {
          filter: Record<string, string | null | undefined>
          skip: number
          take: number
        }) => {
          const filtered = filterActions(filter)
          return [filtered.slice(skip, skip + take), filtered.length]
        },
        findCommunityWatchActionByUUID: async (uuid: string) =>
          actions.find((action) => action.uuid === uuid) ?? null,
      },
      atomService: {
        userIdLoader: {
          load: async (id: string) => ({
            id,
            userName: `user-${id}`,
            displayName: id === '1' ? '隊員一號' : null,
          }),
        },
      },
    },
  } as any)

describe('Community Watch public queries', () => {
  test('returns filtered public actions as a connection', async () => {
    const result = await communityWatchActions(
      {},
      {
        input: {
          first: 1,
          reason: 'porn_ad',
          actionState: 'active',
          appealState: 'received',
          reviewState: 'upheld',
        },
      },
      createContext(),
      {} as any
    )

    expect(result.totalCount).toBe(1)
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].node.uuid).toBe('action-1')
    expect(result.pageInfo.hasNextPage).toBe(false)
  })

  test('returns one public action by uuid', async () => {
    const result = await rootCommunityWatchAction(
      {},
      { input: { uuid: 'action-2' } },
      createContext(),
      {} as any
    )

    expect(result?.uuid).toBe('action-2')
  })

  test('maps public action fields for the transparency page', async () => {
    const commentId = await communityWatchActionPublic.commentId!(
      actions[0],
      {},
      createContext(),
      {} as any
    )
    const sourceId = await communityWatchActionPublic.sourceId!(
      actions[0],
      {},
      createContext(),
      {} as any
    )
    const sourceType = await communityWatchActionPublic.sourceType!(
      actions[0],
      {},
      createContext(),
      {} as any
    )
    const sourceTitle = await communityWatchActionPublic.sourceTitle!(
      actions[0],
      {},
      createContext(),
      {} as any
    )
    const actorDisplayName =
      await communityWatchActionPublic.actorDisplayName!(
        actions[1],
        {},
        createContext(),
        {} as any
      )
    const contentCleared = await communityWatchActionPublic.contentCleared!(
      actions[0],
      {},
      createContext(),
      {} as any
    )

    expect(commentId).toBe(toGlobalId({ type: NODE_TYPES.Comment, id: '102' }))
    expect(sourceId).toBe(toGlobalId({ type: NODE_TYPES.Moment, id: '202' }))
    expect(sourceType).toBe('moment')
    expect(sourceTitle).toBe('202')
    expect(actorDisplayName).toBe('隊員一號')
    expect(contentCleared).toBe(true)
  })
})
