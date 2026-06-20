import { jest } from '@jest/globals'

import { USER_STATE, USER_BAN_REMARK } from '#common/enums/index.js'
import { SpamRingService } from '#connectors/spamRingService.js'

const DAY = 86400000

// mock knex builder：chainable + thenable，依 table 回傳設定好的資料並記錄變更
const makeConnections = ({
  ring,
  members = [],
}: {
  ring: any
  members?: any[]
}) => {
  const rec = {
    memberUpdates: [] as any[],
    ringUpdates: [] as any[],
    eventInserts: [] as any[],
  }
  const builder = (table: string) => {
    const ctx: any = { table, where: {} }
    const b: any = {
      where: (w: any) => {
        Object.assign(ctx.where, w)
        return b
      },
      orderBy: () => b,
      modify: (fn?: any) => {
        if (fn) fn(b)
        return b
      },
      count: () => b,
      clone: () => b,
      offset: () => b,
      limit: () => b,
      first: async () => {
        if (ctx.table === 'spam_ring') return ring
        return undefined
      },
      update: (data: any) => {
        if (ctx.table === 'spam_ring_member') {
          rec.memberUpdates.push({ where: { ...ctx.where }, data })
        }
        if (ctx.table === 'spam_ring') {
          rec.ringUpdates.push(data)
        }
        return {
          returning: async () => [{ ...ring, ...data }],
          then: (resolve: any) => resolve(1),
        }
      },
      insert: async (rows: any) => {
        if (ctx.table === 'spam_ring_event') {
          rec.eventInserts.push(...(Array.isArray(rows) ? rows : [rows]))
        }
      },
      // awaiting the builder directly (findMembers): resolve member rows
      then: (resolve: any) =>
        resolve(ctx.table === 'spam_ring_member' ? members : []),
    }
    return b
  }
  const knex = (t: string) => builder(t)
  const connections: any = {
    knex,
    knexRO: knex,
    knexSearch: knex,
    redis: {},
    objectCacheRedis: {},
  }
  return { connections, rec }
}

const makeUserService = (users: Record<string, any>) => ({
  banUser: jest.fn(async (id: string) => ({ ...users[id], state: USER_STATE.banned })),
  unbanUser: jest.fn(async (id: string) => ({ ...users[id], state: USER_STATE.active })),
  findScore: jest.fn(async (_id: string) => 0),
})

const makeService = (connections: any, users: Record<string, any>) => {
  const service = new SpamRingService(connections)
  ;(service as any).models = {
    userIdLoader: { load: async (id: string) => users[id] ?? null },
  }
  return service
}

describe('SpamRingService.freezeRing', () => {
  test('bans eligible members, skips old / already-banned, freezes ring', async () => {
    const ring = { id: '1', status: 'pending' }
    const members = [
      { id: 'm1', userId: 'u1', status: 'pending', bannedByThisRing: false },
      { id: 'm2', userId: 'u2', status: 'pending', bannedByThisRing: false },
      { id: 'm3', userId: 'u3', status: 'pending', bannedByThisRing: false },
    ]
    const users: Record<string, any> = {
      u1: { id: 'u1', state: USER_STATE.active, createdAt: new Date(Date.now() - DAY) },
      u2: { id: 'u2', state: USER_STATE.active, createdAt: new Date(Date.now() - 100 * DAY) },
      u3: { id: 'u3', state: USER_STATE.banned, createdAt: new Date(Date.now() - DAY) },
    }
    const { connections, rec } = makeConnections({ ring, members })
    const service = makeService(connections, users)
    const userService = makeUserService(users)

    const result = await service.freezeRing({
      ringId: '1',
      actorId: '9',
      userService: userService as any,
    })

    // only u1 banned (u2 old account, u3 already banned)
    expect(userService.banUser).toHaveBeenCalledTimes(1)
    expect(userService.banUser).toHaveBeenCalledWith('u1', {
      remark: USER_BAN_REMARK.spamRing,
    })
    expect(result.frozen.map((u: any) => u.id)).toEqual(['u1'])
    expect(result.skipped.map((s: any) => s.user.id).sort()).toEqual(['u2', 'u3'])
    const u2skip = result.skipped.find((s: any) => s.user.id === 'u2')
    expect(u2skip?.reason).toMatch(/old account/)
    // ring marked frozen
    expect(rec.ringUpdates.at(-1)).toMatchObject({ status: 'frozen', frozenBy: '9' })
    // events include the member ban + ring frozen + a skip
    const actions = rec.eventInserts.map((e) => e.action)
    expect(actions).toEqual(
      expect.arrayContaining(['member_banned', 'member_skipped', 'frozen'])
    )
  })

  test('refuses to freeze a dismissed ring', async () => {
    const { connections } = makeConnections({ ring: { id: '1', status: 'dismissed' } })
    const service = makeService(connections, {})
    await expect(
      service.freezeRing({ ringId: '1', actorId: '9', userService: makeUserService({}) as any })
    ).rejects.toThrow('dismissed')
  })
})

describe('SpamRingService.unfreezeRing', () => {
  test('unbans only members this ring banned; leaves others; restores ring', async () => {
    const ring = { id: '1', status: 'frozen' }
    const members = [
      { id: 'm1', userId: 'u1', status: 'frozen', bannedByThisRing: true },
      { id: 'm2', userId: 'u2', status: 'skipped', bannedByThisRing: false },
      { id: 'm3', userId: 'u3', status: 'frozen', bannedByThisRing: true },
    ]
    const users: Record<string, any> = {
      u1: { id: 'u1', state: USER_STATE.banned },
      u2: { id: 'u2', state: USER_STATE.banned }, // banned by something else
      u3: { id: 'u3', state: USER_STATE.archived }, // state changed since freeze
    }
    const { connections } = makeConnections({ ring, members })
    const service = makeService(connections, users)
    const userService = makeUserService(users)

    const result = await service.unfreezeRing({
      ringId: '1',
      actorId: '9',
      userService: userService as any,
    })

    // only u1 unbanned (u2 not banned-by-this-ring → untouched; u3 archived → skipped)
    expect(userService.unbanUser).toHaveBeenCalledTimes(1)
    expect(userService.unbanUser).toHaveBeenCalledWith('u1', USER_STATE.active)
    expect(result.unbanned.map((u: any) => u.id)).toEqual(['u1'])
    expect(result.skipped.map((s: any) => s.user.id)).toEqual(['u3'])
  })

  test('refuses to unfreeze a ring that is not frozen', async () => {
    const { connections } = makeConnections({ ring: { id: '1', status: 'pending' } })
    const service = makeService(connections, {})
    await expect(
      service.unfreezeRing({ ringId: '1', actorId: '9', userService: makeUserService({}) as any })
    ).rejects.toThrow('not frozen')
  })
})

describe('SpamRingService.dismissRing', () => {
  test('marks ring dismissed and writes an event', async () => {
    const { connections, rec } = makeConnections({ ring: { id: '1', status: 'pending' } })
    const service = makeService(connections, {})
    await service.dismissRing({ ringId: '1', actorId: '9', note: 'false positive' })
    expect(rec.ringUpdates.at(-1)).toMatchObject({ status: 'dismissed', note: 'false positive' })
    expect(rec.eventInserts.map((e) => e.action)).toContain('dismissed')
  })
})

const makeImportConnections = ({
  rings = [],
  members = [],
  users = [],
}: {
  rings?: any[]
  members?: any[]
  users?: any[]
}) => {
  const rec = {
    whereCalls: [] as any[],
    offsets: [] as number[],
    limits: [] as number[],
    orderByCalls: [] as any[],
    ringInserts: [] as any[],
    ringUpdates: [] as any[],
    memberInserts: [] as any[],
    eventInserts: [] as any[],
    whereInCalls: [] as any[],
  }

  const rowsFor = (table: string, where: Record<string, any>) => {
    if (table === 'spam_ring') {
      return rings.filter((r) =>
        Object.entries(where).every(([key, value]) => r[key] === value)
      )
    }
    if (table === 'spam_ring_member') {
      return members.filter((m) =>
        Object.entries(where).every(([key, value]) => m[key] === value)
      )
    }
    return []
  }

  const builder = (table: string) => {
    const ctx: any = { table, where: {}, whereIn: null, offset: undefined, limit: undefined }
    const b: any = {
      where: (w: any) => {
        Object.assign(ctx.where, w)
        rec.whereCalls.push({ table, where: { ...w } })
        return b
      },
      whereIn: (column: string, values: any[]) => {
        ctx.whereIn = { column, values }
        rec.whereInCalls.push({ table, column, values })
        return b
      },
      select: () => b,
      orderBy: (...args: any[]) => {
        rec.orderByCalls.push({ table, args })
        return b
      },
      modify: (fn?: any) => {
        if (fn) fn(b)
        return b
      },
      count: () => {
        ctx.count = true
        return b
      },
      first: async () => {
        if (ctx.count) {
          return { count: String(rowsFor(table, ctx.where).length) }
        }
        return rowsFor(table, ctx.where)[0]
      },
      offset: (value: number) => {
        ctx.offset = value
        rec.offsets.push(value)
        return b
      },
      limit: (value: number) => {
        ctx.limit = value
        rec.limits.push(value)
        return b
      },
      insert: (rows: any) => {
        const inserted = Array.isArray(rows) ? rows : [rows]
        if (table === 'spam_ring') {
          const created = inserted.map((row, index) => ({
            id: row.id ?? String(rings.length + index + 1),
            ...row,
          }))
          rings.push(...created)
          rec.ringInserts.push(...created)
          return { returning: async () => created }
        }
        if (table === 'spam_ring_member') {
          members.push(...inserted)
          rec.memberInserts.push(...inserted)
        }
        if (table === 'spam_ring_event') {
          rec.eventInserts.push(...inserted)
        }
        return b
      },
      update: (data: any) => {
        if (table === 'spam_ring') {
          const ring = rowsFor(table, ctx.where)[0]
          Object.assign(ring, data)
          rec.ringUpdates.push({ where: { ...ctx.where }, data })
          return { returning: async () => [ring] }
        }
        return { returning: async () => [] }
      },
      then: (resolve: any) => {
        if (table === 'user' && ctx.whereIn) {
          return resolve(
            users.filter((u) => ctx.whereIn.values.includes(u[ctx.whereIn.column]))
          )
        }
        const rows = rowsFor(table, ctx.where)
        const start = ctx.offset ?? 0
        const end = ctx.limit === undefined ? undefined : start + ctx.limit
        return resolve(rows.slice(start, end))
      },
    }
    return b
  }

  const knex = (table: string) => builder(table)
  return {
    connections: {
      knex,
      knexRO: knex,
      knexSearch: knex,
      redis: {},
      objectCacheRedis: {},
    } as any,
    rec,
    rings,
    members,
  }
}

describe('SpamRingService query helpers', () => {
  test('findRings and member queries apply filters and pagination', async () => {
    const { connections, rec } = makeImportConnections({
      rings: [{ id: 'r1', status: 'pending' }],
      members: [
        { id: 'm1', ringId: 'r1', userId: 'u1' },
        { id: 'm2', ringId: 'r1', userId: 'u2' },
      ],
    })
    const service = new SpamRingService(connections)

    await (service.findRings({ status: 'pending' }) as any)
    await service.findMembersAndCount('r1', { take: 1, skip: 1 })
    await service.findMembers('r1', 5)
    await service.findEvents('r1')

    expect(rec.whereCalls).toEqual(
      expect.arrayContaining([
        { table: 'spam_ring', where: { status: 'pending' } },
        { table: 'spam_ring_member', where: { ringId: 'r1' } },
        { table: 'spam_ring_event', where: { ringId: 'r1' } },
      ])
    )
    expect(rec.offsets).toContain(1)
    expect(rec.limits).toEqual(expect.arrayContaining([1, 5]))
    expect(rec.orderByCalls).toEqual(
      expect.arrayContaining([
        { table: 'spam_ring_member', args: ['id', 'asc'] },
        { table: 'spam_ring_event', args: ['createdAt', 'desc'] },
      ])
    )
  })
})

describe('SpamRingService.upsertCandidates', () => {
  test('creates a new ring, resolves unique ids, inserts new members and event', async () => {
    const { connections, rec, members } = makeImportConnections({
      users: [
        { id: 'u1', userName: 'alice' },
        { id: 'u2', userName: 'bob' },
      ],
    })
    const service = new SpamRingService(connections)

    const result = await service.upsertCandidates([
      {
        fingerprint: 'fp-new',
        memberUserIds: ['u1', 'u1', 'u2'],
        signals: { nearDupRingSize: 2 },
        nArticles: 3,
        nAuthors: 2,
        score: 0.91,
        memberEvidence: { u1: { articleIds: ['a1'] } },
      },
    ])

    expect(result.created).toBe(1)
    expect(result.updated).toBe(0)
    expect(rec.ringInserts[0]).toMatchObject({
      fingerprint: 'fp-new',
      status: 'pending',
      nArticles: 3,
      nAuthors: 2,
      score: 0.91,
    })
    expect(members.map((m) => m.userId)).toEqual(['u1', 'u2'])
    expect(rec.memberInserts[0].evidence).toBe(
      JSON.stringify({ articleIds: ['a1'] })
    )
    expect(rec.eventInserts.map((e) => e.action)).toContain('detected')
  })

  test('updates pending rings, resolves usernames, and skips locked decisions', async () => {
    const { connections, rec, members } = makeImportConnections({
      rings: [
        { id: 'r1', fingerprint: 'fp-existing', status: 'pending' },
        { id: 'r2', fingerprint: 'fp-frozen', status: 'frozen' },
      ],
      members: [{ id: 'm1', ringId: 'r1', userId: 'u1' }],
      users: [
        { id: 'u1', userName: 'alice' },
        { id: 'u3', userName: 'charlie' },
      ],
    })
    const service = new SpamRingService(connections)

    const result = await service.upsertCandidates([
      {
        fingerprint: 'fp-existing',
        memberUserNames: ['alice', 'charlie', 'charlie'],
        signals: { topEntity: 'brand:test' },
        nArticles: 8,
        nAuthors: 2,
        newAccountRatio: 0.5,
      },
      {
        fingerprint: 'fp-frozen',
        memberUserIds: ['u9'],
      },
    ])

    expect(result.created).toBe(0)
    expect(result.updated).toBe(1)
    expect(result.skipped).toBe(1)
    expect(rec.ringUpdates[0]).toMatchObject({
      where: { id: 'r1' },
      data: {
        signals: JSON.stringify({ topEntity: 'brand:test' }),
        nArticles: 8,
        nAuthors: 2,
        newAccountRatio: 0.5,
      },
    })
    expect(rec.whereInCalls[0]).toMatchObject({
      table: 'user',
      column: 'userName',
      values: ['alice', 'charlie', 'charlie'],
    })
    expect(members.map((m) => m.userId).sort()).toEqual(['u1', 'u3'])
    expect(rec.memberInserts).toHaveLength(1)
  })
})
