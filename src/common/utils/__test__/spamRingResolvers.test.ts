import { jest } from '@jest/globals'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import dismissSpamRing from '#mutations/user/dismissSpamRing.js'
import freezeSpamRing from '#mutations/user/freezeSpamRing.js'
import unfreezeSpamRing from '#mutations/user/unfreezeSpamRing.js'
import upsertSpamRingCandidates from '#mutations/user/upsertSpamRingCandidates.js'

const connectionFromQuery = jest.fn(async () => ({
  edges: [],
  totalCount: 0,
  pageInfo: {
    startCursor: '',
    endCursor: '',
    hasPreviousPage: false,
    hasNextPage: false,
  },
}))

jest.unstable_mockModule('#common/utils/connections.js', () => ({
  connectionFromQuery,
}))

const { spamRings } = await import('#queries/system/oss/spamRings.js')
const { SpamRing, SpamRingMember, SpamRingEvent } = await import(
  '#queries/system/spamRing/index.js'
)

const ringGlobalId = (id: string) =>
  toGlobalId({ type: NODE_TYPES.SpamRing, id })

const makeContext = (viewer: any = { id: '9' }) => {
  const userService = { __sentinel: 'userService' }
  return {
    viewer,
    dataSources: {
      userService,
      articleService: { findByAuthor: jest.fn(async () => []) },
      connections: { redis: { __sentinel: 'redis' } },
      spamRingService: {
        freezeRing: jest.fn(async () => ({
          ring: {},
          frozen: [],
          skipped: [],
        })),
        unfreezeRing: jest.fn(async () => ({
          ring: {},
          unbanned: [],
          skipped: [],
        })),
        dismissRing: jest.fn(async () => ({ id: '1' })),
        upsertCandidates: jest.fn(async () => ({
          created: 1,
          updated: 0,
          skipped: 0,
          rings: [],
        })),
      },
    },
  } as any
}

describe('spam ring mutation resolvers', () => {
  beforeEach(() => {
    connectionFromQuery.mockClear()
  })

  test('freezeSpamRing decodes global id and forwards viewer + userService', async () => {
    const ctx = makeContext()
    await (freezeSpamRing as any)(
      null,
      { input: { id: ringGlobalId('1'), remark: 'r' } },
      ctx
    )
    expect(ctx.dataSources.spamRingService.freezeRing).toHaveBeenCalledWith({
      ringId: '1',
      actorId: '9',
      remark: 'r',
      userService: ctx.dataSources.userService,
    })
  })

  test('freezeSpamRing forwards memberUserIds for a scoped freeze (audit F1)', async () => {
    const ctx = makeContext()
    await (freezeSpamRing as any)(
      null,
      {
        input: {
          id: ringGlobalId('1'),
          remark: 'r',
          memberUserIds: ['u1', 'u2'],
        },
      },
      ctx
    )
    expect(ctx.dataSources.spamRingService.freezeRing).toHaveBeenCalledWith({
      ringId: '1',
      actorId: '9',
      remark: 'r',
      memberUserIds: ['u1', 'u2'],
      userService: ctx.dataSources.userService,
    })
  })

  test('unfreezeSpamRing forwards ringId + userService', async () => {
    const ctx = makeContext()
    await (unfreezeSpamRing as any)(
      null,
      { input: { id: ringGlobalId('7') } },
      ctx
    )
    expect(ctx.dataSources.spamRingService.unfreezeRing).toHaveBeenCalledWith({
      ringId: '7',
      actorId: '9',
      userService: ctx.dataSources.userService,
    })
  })

  test('dismissSpamRing forwards note', async () => {
    const ctx = makeContext()
    await (dismissSpamRing as any)(
      null,
      { input: { id: ringGlobalId('3'), note: 'fp' } },
      ctx
    )
    expect(ctx.dataSources.spamRingService.dismissRing).toHaveBeenCalledWith({
      ringId: '3',
      actorId: '9',
      note: 'fp',
    })
  })

  test('freezeSpamRing purges caches of frozen members', async () => {
    const ctx = makeContext()
    ctx.dataSources.spamRingService.freezeRing = jest.fn(async () => ({
      ring: {},
      frozen: [{ id: '11' }, { id: '12' }],
      skipped: [],
    }))
    await (freezeSpamRing as any)(
      null,
      { input: { id: ringGlobalId('1') } },
      ctx
    )
    expect(ctx.dataSources.articleService.findByAuthor).toHaveBeenCalledWith(
      '11'
    )
    expect(ctx.dataSources.articleService.findByAuthor).toHaveBeenCalledWith(
      '12'
    )
  })

  test('unfreezeSpamRing purges caches of restored members', async () => {
    const ctx = makeContext()
    ctx.dataSources.spamRingService.unfreezeRing = jest.fn(async () => ({
      ring: {},
      unbanned: [{ id: '21' }],
      skipped: [],
    }))
    await (unfreezeSpamRing as any)(
      null,
      { input: { id: ringGlobalId('2') } },
      ctx
    )
    expect(ctx.dataSources.articleService.findByAuthor).toHaveBeenCalledWith(
      '21'
    )
  })

  test('freezeSpamRing rejects when viewer has no id', async () => {
    await expect(
      (freezeSpamRing as any)(
        null,
        { input: { id: ringGlobalId('1') } },
        makeContext({})
      )
    ).rejects.toThrow('viewer has no id')
  })

  test('unfreezeSpamRing rejects when viewer has no id', async () => {
    await expect(
      (unfreezeSpamRing as any)(
        null,
        { input: { id: ringGlobalId('1') } },
        makeContext({})
      )
    ).rejects.toThrow('viewer has no id')
  })

  test('dismissSpamRing rejects when viewer has no id', async () => {
    await expect(
      (dismissSpamRing as any)(
        null,
        { input: { id: ringGlobalId('1') } },
        makeContext({})
      )
    ).rejects.toThrow('viewer has no id')
  })

  test('upsertSpamRingCandidates parses evidence JSON and coerces nulls', async () => {
    const ctx = makeContext()
    await (upsertSpamRingCandidates as any)(
      null,
      {
        input: {
          candidates: [
            {
              fingerprint: 'fp1',
              memberUserIds: ['u1', 'u2'],
              memberUserNames: null,
              signals: { nearDupRingSize: 2 },
              nArticles: 5,
              nAuthors: 2,
              newAccountRatio: null,
              score: 0.9,
              severity: null,
              firstSeenAt: null,
              lastSeenAt: null,
              memberEvidence: JSON.stringify({ u1: { a: 1 } }),
            },
          ],
        },
      },
      ctx
    )
    const arg = (ctx.dataSources.spamRingService.upsertCandidates as any).mock
      .calls[0][0]
    expect(arg[0].fingerprint).toBe('fp1')
    expect(arg[0].memberUserIds).toEqual(['u1', 'u2'])
    expect(arg[0].memberUserNames).toBeUndefined()
    expect(arg[0].newAccountRatio).toBeUndefined()
    expect(arg[0].memberEvidence).toEqual({ u1: { a: 1 } })
  })
})

describe('spam ring query resolvers', () => {
  beforeEach(() => {
    connectionFromQuery.mockClear()
  })

  test('oss.spamRings forwards status filter and nAuthors sorting', async () => {
    const query = { __query: 'spam-ring-query' }
    const ctx = {
      dataSources: {
        spamRingService: {
          findRings: jest.fn(() => query),
        },
      },
    } as any
    const input = {
      first: 20,
      sort: 'nAuthors',
      filter: { status: 'pending' },
    }

    await (spamRings as any)(null, { input }, ctx)

    expect(ctx.dataSources.spamRingService.findRings).toHaveBeenCalledWith({
      status: 'pending',
    })
    expect(connectionFromQuery).toHaveBeenCalledWith({
      query,
      args: input,
      orderBy: { column: 'nAuthors', order: 'desc' },
    })
  })

  test('oss.spamRings defaults to score sorting and no status filter', async () => {
    const query = { __query: 'score-query' }
    const ctx = {
      dataSources: {
        spamRingService: {
          findRings: jest.fn(() => query),
        },
      },
    } as any

    await (spamRings as any)(null, { input: { first: 10 } }, ctx)

    expect(ctx.dataSources.spamRingService.findRings).toHaveBeenCalledWith({
      status: undefined,
    })
    expect(connectionFromQuery).toHaveBeenCalledWith({
      query,
      args: { first: 10 },
      orderBy: { column: 'score', order: 'desc' },
    })
  })

  test('oss.spamRings supports detectedAt sorting', async () => {
    const query = { __query: 'detected-query' }
    const ctx = {
      dataSources: {
        spamRingService: {
          findRings: jest.fn(() => query),
        },
      },
    } as any

    await (spamRings as any)(null, { input: { sort: 'detectedAt' } }, ctx)

    expect(connectionFromQuery).toHaveBeenCalledWith({
      query,
      args: { sort: 'detectedAt' },
      orderBy: { column: 'detectedAt', order: 'desc' },
    })
  })
})

describe('SpamRing type resolvers', () => {
  test('resolves ids, frozenBy, members, samples, and events', async () => {
    const frozenBy = { id: 'u9' }
    const sampleUser = { id: 'u1' }
    const members = [
      { id: 'm1', userId: 'u1' },
      { id: 'm2', userId: 'missing' },
    ]
    const events = [{ id: 'e1', ringId: 'r1' }]
    const ctx = {
      dataSources: {
        atomService: {
          userIdLoader: {
            load: jest.fn(async (id: string) => {
              if (id === 'u9') return frozenBy
              if (id === 'u1') return sampleUser
              return null
            }),
          },
        },
        spamRingService: {
          findMembersAndCount: jest.fn(async () => [members, 2]),
          findMembers: jest.fn(async () => members),
          findEvents: jest.fn(async () => events),
        },
      },
    } as any

    expect((SpamRing.id as any)({ id: 'r1' })).toBe(ringGlobalId('r1'))
    await expect(
      (SpamRing.frozenBy as any)({ frozenBy: 'u9' }, null, ctx)
    ).resolves.toBe(frozenBy)
    expect((SpamRing.frozenBy as any)({ frozenBy: null }, null, ctx)).toBeNull()

    const memberConnection = await (SpamRing.members as any)(
      { id: 'r1' },
      { input: { first: 1 } },
      ctx
    )
    expect(
      ctx.dataSources.spamRingService.findMembersAndCount
    ).toHaveBeenCalledWith('r1', { take: 1, skip: 0 })
    expect(memberConnection.totalCount).toBe(2)
    expect(memberConnection.edges.map((edge: any) => edge.node.id)).toEqual([
      'm1',
      'm2',
    ])

    await expect(
      (SpamRing.memberSample as any)({ id: 'r1' }, { limit: 3 }, ctx)
    ).resolves.toEqual([sampleUser])
    expect(ctx.dataSources.spamRingService.findMembers).toHaveBeenCalledWith(
      'r1',
      3
    )

    await expect(
      (SpamRing.events as any)({ id: 'r1' }, null, ctx)
    ).resolves.toBe(events)
  })

  test('resolves member and event fields', async () => {
    const actor = { id: 'u9' }
    const user = { id: 'u1' }
    const ctx = {
      dataSources: {
        atomService: {
          userIdLoader: {
            load: jest.fn(async (id: string) => (id === 'u9' ? actor : user)),
          },
        },
      },
    } as any

    expect((SpamRingMember.id as any)({ id: 'm1' })).toBe(
      toGlobalId({ type: NODE_TYPES.SpamRingMember, id: 'm1' })
    )
    await expect(
      (SpamRingMember.user as any)({ userId: 'u1' }, null, ctx)
    ).resolves.toBe(user)

    expect((SpamRingEvent.id as any)({ id: 'e1' })).toBe(
      toGlobalId({ type: NODE_TYPES.SpamRingEvent, id: 'e1' })
    )
    await expect(
      (SpamRingEvent.actor as any)({ actorId: 'u9' }, null, ctx)
    ).resolves.toBe(actor)
    expect(
      (SpamRingEvent.actor as any)({ actorId: null }, null, ctx)
    ).toBeNull()
    expect((SpamRingEvent.detail as any)({ detail: { reason: 'fp' } })).toBe(
      JSON.stringify({ reason: 'fp' })
    )
    expect((SpamRingEvent.detail as any)({ detail: null })).toBeNull()
  })
})
