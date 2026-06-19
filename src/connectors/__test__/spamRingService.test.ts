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
