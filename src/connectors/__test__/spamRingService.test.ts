import { jest } from '@jest/globals'

import { USER_STATE, USER_BAN_REMARK } from '#common/enums/index.js'
import { SpamRingService } from '#connectors/spamRingService.js'

const DAY = 86400000

// mock knex builder：chainable + thenable，依 table 回傳設定好的資料並記錄變更
const makeConnections = ({
  ring,
  members = [],
  users = {},
}: {
  ring: any
  members?: any[]
  users?: Record<string, any>
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
      transacting: () => b,
      forUpdate: () => b,
      select: () => b,
      whereIn: () => b,
      whereNot: () => b,
      del: () => b,
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
        if (ctx.table === 'user') return users[ctx.where.id] ?? undefined
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
          transacting: () => ({
            returning: async () => [{ ...ring, ...data }],
            then: (resolve: any) => resolve(1),
          }),
          returning: async () => [{ ...ring, ...data }],
          then: (resolve: any) => resolve(1),
        }
      },
      insert: (rows: any) => {
        if (ctx.table === 'spam_ring_event') {
          rec.eventInserts.push(...(Array.isArray(rows) ? rows : [rows]))
        }
        const inserted = Array.isArray(rows) ? rows[0] : rows
        const res: any = {
          transacting: () => res,
          returning: async () => [{ ...ring, ...inserted }],
          then: (resolve: any) => resolve(undefined),
        }
        return res
      },
      // awaiting the builder directly (findMembers): resolve member rows
      then: (resolve: any) =>
        resolve(ctx.table === 'spam_ring_member' ? members : []),
    }
    return b
  }
  const knex: any = (t: string) => builder(t)
  // run the freeze/unfreeze transaction inline against the same mock builder
  knex.transaction = async (cb: (trx: any) => Promise<any>) => cb({})
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
  banUser: jest.fn(async (id: string) => ({
    ...users[id],
    state: USER_STATE.banned,
  })),
  unbanUser: jest.fn(async (id: string) => ({
    ...users[id],
    state: USER_STATE.active,
  })),
  freezeUser: jest.fn(async (id: string) => ({
    ...users[id],
    state: USER_STATE.frozen,
  })),
  unfreezeUser: jest.fn(async (id: string, state: string) => ({
    ...users[id],
    state,
  })),
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
  test('bans eligible members, skips old / already-banned for low-confidence ring, freezes ring', async () => {
    const ring = { id: '1', status: 'pending', signals: { nearDupRingSize: 1 } }
    const members = [
      { id: 'm1', userId: 'u1', status: 'pending', bannedByThisRing: false },
      { id: 'm2', userId: 'u2', status: 'pending', bannedByThisRing: false },
      { id: 'm3', userId: 'u3', status: 'pending', bannedByThisRing: false },
    ]
    const users: Record<string, any> = {
      u1: {
        id: 'u1',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - DAY),
      },
      u2: {
        id: 'u2',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - 100 * DAY),
      },
      u3: {
        id: 'u3',
        state: USER_STATE.banned,
        createdAt: new Date(Date.now() - DAY),
      },
    }
    const { connections, rec } = makeConnections({ ring, members, users })
    const service = makeService(connections, users)
    const userService = makeUserService(users)

    const result = await service.freezeRing({
      ringId: '1',
      actorId: '9',
      userService: userService as any,
    })

    // only u1 frozen (u2 old account, u3 already banned)
    expect(userService.freezeUser).toHaveBeenCalledTimes(1)
    expect(userService.freezeUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        remark: USER_BAN_REMARK.spamRing,
        source: 'model_assisted',
        automationRole: 'assisted',
        reason: 'spam',
        actorId: '9',
      })
    )
    expect(userService.banUser).not.toHaveBeenCalled()
    expect(result.frozen.map((u: any) => u.id)).toEqual(['u1'])
    expect(result.skipped.map((s: any) => s.user.id).sort()).toEqual([
      'u2',
      'u3',
    ])
    const u2skip = result.skipped.find((s: any) => s.user.id === 'u2')
    expect(u2skip?.reason).toMatch(/old account/)
    // ring marked frozen
    expect(rec.ringUpdates.at(-1)).toMatchObject({
      status: 'frozen',
      frozenBy: '9',
    })
    // events include the member ban + ring frozen + a skip
    const actions = rec.eventInserts.map((e) => e.action)
    expect(actions).toEqual(
      expect.arrayContaining(['member_frozen', 'member_skipped', 'frozen'])
    )
  })

  test('protects old / high-karma members even in a high-confidence ring', async () => {
    const ring = {
      id: '1',
      status: 'pending',
      signals: { nearDupRingSize: 12, sampleCodes: ['LIDANG'] }, // high confidence
    }
    const members = [
      { id: 'm1', userId: 'u1', status: 'pending', bannedByThisRing: false },
      { id: 'm2', userId: 'u2', status: 'pending', bannedByThisRing: false },
      { id: 'm3', userId: 'u3', status: 'pending', bannedByThisRing: false },
    ]
    const users: Record<string, any> = {
      u1: {
        id: 'u1',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - 100 * DAY), // old account (> 60d)
      },
      u2: {
        id: 'u2',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - DAY), // new but high karma
      },
      u3: {
        id: 'u3',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - DAY), // new, low karma → frozen
      },
    }
    const { connections, rec } = makeConnections({ ring, members, users })
    const service = makeService(connections, users)
    const userService = makeUserService(users)
    userService.findScore = jest.fn(async (id: string) =>
      id === 'u2' ? 10 : 0
    )

    const result = await service.freezeRing({
      ringId: '1',
      actorId: '9',
      userService: userService as any,
    })

    // high confidence no longer bypasses the guard: u1 (old) and u2 (high karma)
    // go to human; only u3 (new + low karma) is frozen.
    expect(userService.freezeUser).toHaveBeenCalledTimes(1)
    expect(userService.freezeUser).toHaveBeenCalledWith(
      'u3',
      expect.objectContaining({ remark: USER_BAN_REMARK.spamRing })
    )
    expect(result.frozen.map((u: any) => u.id)).toEqual(['u3'])
    expect(result.skipped.map((s: any) => s.user.id).sort()).toEqual([
      'u1',
      'u2',
    ])

    const frozenEvent = rec.eventInserts.find((e) => e.action === 'frozen')
    expect(JSON.parse(frozenEvent.detail)).toMatchObject({
      frozen: 1,
      skipped: 2,
      highConfidence: true,
    })
  })

  test('skips a member already frozen by something else (no re-claim)', async () => {
    const ring = { id: '1', status: 'pending', signals: { nearDupRingSize: 1 } }
    const members = [
      { id: 'm1', userId: 'u1', status: 'pending', bannedByThisRing: false },
    ]
    const users: Record<string, any> = {
      u1: {
        id: 'u1',
        state: USER_STATE.frozen,
        createdAt: new Date(Date.now() - DAY),
      },
    }
    const { connections } = makeConnections({ ring, members, users })
    const service = makeService(connections, users)
    const userService = makeUserService(users)

    const result = await service.freezeRing({
      ringId: '1',
      actorId: '9',
      userService: userService as any,
    })

    expect(userService.freezeUser).not.toHaveBeenCalled()
    expect(result.frozen).toEqual([])
    expect(result.skipped.map((s: any) => s.reason)).toEqual(['already frozen'])
  })

  test('idempotent no-op when a frozen ring has no new pending member', async () => {
    // concurrency guard (audit F4): a second freeze that finds the ring already
    // frozen inside the transaction must not re-process members.
    const ring = { id: '1', status: 'frozen', signals: { nearDupRingSize: 1 } }
    const members = [
      { id: 'm1', userId: 'u1', status: 'frozen', bannedByThisRing: true },
    ]
    const users: Record<string, any> = {
      u1: {
        id: 'u1',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - DAY),
      },
    }
    const { connections } = makeConnections({ ring, members, users })
    const service = makeService(connections, users)
    const userService = makeUserService(users)

    const result = await service.freezeRing({
      ringId: '1',
      actorId: '9',
      userService: userService as any,
    })

    expect(userService.freezeUser).not.toHaveBeenCalled()
    expect(result.frozen).toEqual([])
    expect(result.ring.status).toBe('frozen')
  })

  test('a frozen ring processes only newly appended pending members', async () => {
    const frozenAt = new Date(Date.now() - DAY)
    const ring = {
      id: '1',
      status: 'frozen',
      frozenAt,
      frozenBy: 'original-admin',
      signals: { nearDupRingSize: 3 },
    }
    const members = [
      { id: 'm1', userId: 'u1', status: 'frozen', bannedByThisRing: true },
      { id: 'm2', userId: 'u2', status: 'pending', bannedByThisRing: false },
      { id: 'm3', userId: 'u3', status: 'pending', bannedByThisRing: false },
    ]
    const users: Record<string, any> = {
      u1: {
        id: 'u1',
        state: USER_STATE.frozen,
        createdAt: new Date(Date.now() - DAY),
      },
      u2: {
        id: 'u2',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - DAY),
      },
      u3: {
        id: 'u3',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - DAY),
      },
    }
    const { connections, rec } = makeConnections({ ring, members, users })
    const service = makeService(connections, users)
    const userService = makeUserService(users)

    const result = await service.freezeRing({
      ringId: '1',
      actorId: 'refresh-job',
      memberUserIds: ['u2'],
      userService: userService as any,
    })

    expect(userService.freezeUser).toHaveBeenCalledTimes(1)
    expect(userService.freezeUser).toHaveBeenCalledWith(
      'u2',
      expect.objectContaining({ actorId: 'refresh-job' })
    )
    expect(result.frozen.map((user: any) => user.id)).toEqual(['u2'])
    expect(rec.memberUpdates.map((update) => update.where.id)).toEqual(['m2'])
    expect(rec.ringUpdates.at(-1)).not.toHaveProperty('frozenAt')
    expect(rec.ringUpdates.at(-1)).not.toHaveProperty('frozenBy')
    const event = rec.eventInserts.find((item) => item.action === 'frozen')
    expect(JSON.parse(event.detail)).toMatchObject({ refresh: true, frozen: 1 })
  })

  test('memberUserIds restricts the freeze to verified members; others are skipped untouched', async () => {
    // audit F1: spam_ring_member is a union of all past detection runs, so a
    // scoped freeze must only touch members verified by the current run.
    const ring = { id: '1', status: 'pending', signals: { nearDupRingSize: 1 } }
    const members = [
      { id: 'm1', userId: 'u1', status: 'pending', bannedByThisRing: false },
      { id: 'm2', userId: 'u2', status: 'pending', bannedByThisRing: false },
    ]
    const users: Record<string, any> = {
      u1: {
        id: 'u1',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - DAY),
      },
      // stale member from an earlier detection run — must stay untouched
      u2: {
        id: 'u2',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - DAY),
      },
    }
    const { connections, rec } = makeConnections({ ring, members, users })
    const service = makeService(connections, users)
    const userService = makeUserService(users)

    const result = await service.freezeRing({
      ringId: '1',
      actorId: '9',
      memberUserIds: ['u1'],
      userService: userService as any,
    })

    // only the verified member is frozen; u2 is never passed to freezeUser
    expect(userService.freezeUser).toHaveBeenCalledTimes(1)
    expect(userService.freezeUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ remark: USER_BAN_REMARK.spamRing })
    )
    expect(result.frozen.map((u: any) => u.id)).toEqual(['u1'])
    expect(result.skipped).toEqual([
      { user: users.u2, reason: 'not_in_verified_candidate' },
    ])
    // the stale member row is marked skipped with the scope reason
    const m2Update = rec.memberUpdates.find((u) => u.where.id === 'm2')
    expect(m2Update?.data).toMatchObject({
      status: 'skipped',
      skipReason: 'not_in_verified_candidate',
      bannedByThisRing: false,
    })
    expect(rec.eventInserts.map((e) => e.action)).toEqual(
      expect.arrayContaining(['member_frozen', 'member_skipped', 'frozen'])
    )
    // ring itself still transitions to frozen
    expect(rec.ringUpdates.at(-1)).toMatchObject({ status: 'frozen' })
  })

  test('guardrails still apply to members inside the memberUserIds scope', async () => {
    const ring = { id: '1', status: 'pending', signals: { nearDupRingSize: 1 } }
    const members = [
      { id: 'm1', userId: 'u1', status: 'pending', bannedByThisRing: false },
      { id: 'm2', userId: 'u2', status: 'pending', bannedByThisRing: false },
    ]
    const users: Record<string, any> = {
      // in scope but old account → guardrail wins, goes to human review
      u1: {
        id: 'u1',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - 100 * DAY),
      },
      u2: {
        id: 'u2',
        state: USER_STATE.active,
        createdAt: new Date(Date.now() - DAY),
      },
    }
    const { connections } = makeConnections({ ring, members, users })
    const service = makeService(connections, users)
    const userService = makeUserService(users)

    const result = await service.freezeRing({
      ringId: '1',
      actorId: '9',
      memberUserIds: ['u1', 'u2'],
      userService: userService as any,
    })

    expect(userService.freezeUser).toHaveBeenCalledTimes(1)
    expect(userService.freezeUser).toHaveBeenCalledWith(
      'u2',
      expect.objectContaining({ remark: USER_BAN_REMARK.spamRing })
    )
    expect(result.frozen.map((u: any) => u.id)).toEqual(['u2'])
    expect(result.skipped.map((s: any) => s.user.id)).toEqual(['u1'])
    expect(result.skipped[0].reason).toMatch(/old account/)
  })

  test('rejects an explicitly empty memberUserIds list', async () => {
    const { connections } = makeConnections({
      ring: { id: '1', status: 'pending' },
    })
    const service = makeService(connections, {})
    await expect(
      service.freezeRing({
        ringId: '1',
        actorId: '9',
        memberUserIds: [],
        userService: makeUserService({}) as any,
      })
    ).rejects.toThrow('memberUserIds must not be empty')
  })

  test('refuses to freeze a dismissed ring', async () => {
    const { connections } = makeConnections({
      ring: { id: '1', status: 'dismissed' },
    })
    const service = makeService(connections, {})
    await expect(
      service.freezeRing({
        ringId: '1',
        actorId: '9',
        userService: makeUserService({}) as any,
      })
    ).rejects.toThrow('dismissed')
  })
})

describe('SpamRingService.unfreezeRing', () => {
  test('unfreezes only members this ring froze; restores preFreezeState; leaves others', async () => {
    const ring = { id: '1', status: 'frozen' }
    const members = [
      {
        id: 'm1',
        userId: 'u1',
        status: 'frozen',
        bannedByThisRing: true,
        preFreezeState: USER_STATE.active,
      },
      { id: 'm2', userId: 'u2', status: 'skipped', bannedByThisRing: false },
      {
        id: 'm3',
        userId: 'u3',
        status: 'frozen',
        bannedByThisRing: true,
        preFreezeState: USER_STATE.active,
      },
    ]
    const users: Record<string, any> = {
      u1: { id: 'u1', state: USER_STATE.frozen },
      u2: { id: 'u2', state: USER_STATE.frozen }, // frozen by something else
      u3: { id: 'u3', state: USER_STATE.archived }, // state changed since freeze
    }
    const { connections } = makeConnections({ ring, members, users })
    const service = makeService(connections, users)
    const userService = makeUserService(users)

    const result = await service.unfreezeRing({
      ringId: '1',
      actorId: '9',
      userService: userService as any,
    })

    // only u1 unfrozen (u2 not frozen-by-this-ring → untouched; u3 archived → skipped)
    expect(userService.unfreezeUser).toHaveBeenCalledTimes(1)
    expect(userService.unfreezeUser).toHaveBeenCalledWith(
      'u1',
      USER_STATE.active,
      expect.anything(),
      { actorId: '9' }
    )
    expect(result.unbanned.map((u: any) => u.id)).toEqual(['u1'])
    expect(result.skipped.map((s: any) => s.user.id)).toEqual(['u3'])
  })

  test('refuses to unfreeze a ring that is not frozen', async () => {
    const { connections } = makeConnections({
      ring: { id: '1', status: 'pending' },
    })
    const service = makeService(connections, {})
    await expect(
      service.unfreezeRing({
        ringId: '1',
        actorId: '9',
        userService: makeUserService({}) as any,
      })
    ).rejects.toThrow('not frozen')
  })
})

describe('SpamRingService.dismissRing', () => {
  test('marks ring dismissed and writes an event', async () => {
    const { connections, rec } = makeConnections({
      ring: { id: '1', status: 'pending' },
    })
    const service = makeService(connections, {})
    await service.dismissRing({
      ringId: '1',
      actorId: '9',
      note: 'false positive',
    })
    expect(rec.ringUpdates.at(-1)).toMatchObject({
      status: 'dismissed',
      note: 'false positive',
    })
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
    whereExistsCalls: [] as any[],
    joinCalls: [] as any[],
    whereRawCalls: [] as any[],
    whereNotInCalls: [] as any[],
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
    const ctx: any = {
      table,
      where: {},
      whereIn: null,
      offset: undefined,
      limit: undefined,
    }
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
      whereNot: () => b,
      whereNotIn: (column: string, values: any[]) => {
        rec.whereNotInCalls.push({ table, column, values })
        return b
      },
      whereExists: (fn: any) => {
        rec.whereExistsCalls.push({ table })
        fn.call(b)
        return b
      },
      from: (fromTable: string) => {
        ctx.table = fromTable
        return b
      },
      join: (...args: any[]) => {
        rec.joinCalls.push({ table: ctx.table, args })
        return b
      },
      whereRaw: (...args: any[]) => {
        rec.whereRawCalls.push({ table: ctx.table, args })
        return b
      },
      del: () => b,
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
            users.filter((u) =>
              ctx.whereIn.values.includes(u[ctx.whereIn.column])
            )
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

  test('findRings can filter to actionable pending rings', async () => {
    const { connections, rec } = makeImportConnections({
      rings: [{ id: 'r1', status: 'pending' }],
    })
    const service = new SpamRingService(connections)

    await (service.findRings({
      status: 'pending',
      actionable: true,
    }) as any)

    expect(rec.whereCalls).toEqual(
      expect.arrayContaining([
        { table: 'spam_ring', where: { status: 'pending' } },
      ])
    )
    expect(rec.whereExistsCalls).toEqual([{ table: 'spam_ring' }])
    expect(rec.joinCalls).toEqual(
      expect.arrayContaining([
        {
          table: 'spam_ring_member',
          args: ['user', 'user.id', 'spam_ring_member.userId'],
        },
      ])
    )
    expect(rec.whereRawCalls).toEqual(
      expect.arrayContaining([
        {
          table: 'spam_ring_member',
          args: ['"spam_ring_member"."ring_id" = "spam_ring"."id"'],
        },
      ])
    )
    expect(rec.whereInCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column: 'spam_ring_member.status',
          values: ['pending', 'restored'],
        }),
      ])
    )
    expect(rec.whereNotInCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column: 'user.state',
          values: [USER_STATE.banned, USER_STATE.frozen, USER_STATE.archived],
        }),
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
    // rings carries the upserted entities so the job can freeze by id
    expect(result.rings).toHaveLength(1)
    expect(result.rings[0]).toMatchObject({
      fingerprint: 'fp-new',
      status: 'pending',
    })
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
    // both the updated ring and the locked (skipped) ring are returned
    expect(result.rings.map((r) => r.fingerprint).sort()).toEqual([
      'fp-existing',
      'fp-frozen',
    ])
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
