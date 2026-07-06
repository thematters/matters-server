import { SystemService } from '#connectors/systemService.js'

// mock knex builder：chainable + thenable，記錄 moderation_case / moderation_event
// 的寫入以驗證帳號凍結 case 的建立與結案（無 DB）
const makeConnections = ({
  existingCase = null,
}: {
  existingCase?: any
} = {}) => {
  const rec = {
    caseInserts: [] as any[],
    caseUpdates: [] as any[],
    eventInserts: [] as any[],
  }
  const builder = (table: string) => {
    const ctx: any = { table, where: {} }
    const b: any = {
      where: (w: any) => {
        Object.assign(ctx.where, w)
        return b
      },
      whereNull: () => b,
      orderBy: () => b,
      first: async () => {
        if (ctx.table === 'moderation_case') {
          return existingCase ?? undefined
        }
        return undefined
      },
      insert: (rows: any) => {
        const row = Array.isArray(rows) ? rows[0] : rows
        if (ctx.table === 'moderation_case') {
          rec.caseInserts.push(row)
          const res: any = {
            onConflict: () => ({
              ignore: () => ({
                returning: async () =>
                  existingCase ? [] : [{ id: '1', status: 'received', ...row }],
              }),
            }),
          }
          return res
        }
        if (ctx.table === 'moderation_event') {
          rec.eventInserts.push(row)
        }
        return {
          then: (resolve: any) => resolve(undefined),
          returning: async () => [row],
        }
      },
      update: (data: any) => {
        if (ctx.table === 'moderation_case') {
          rec.caseUpdates.push({ where: { ...ctx.where }, data })
        }
        return {
          returning: async () => [
            { id: '1', ...(existingCase ?? {}), ...data },
          ],
          then: (resolve: any) => resolve(1),
        }
      },
    }
    return b
  }
  const knex: any = (t: string) => builder(t)
  knex.fn = { now: () => new Date() }
  const connections: any = {
    knex,
    knexRO: knex,
    knexSearch: knex,
    redis: {},
    objectCacheRedis: {},
  }
  return { connections, rec }
}

describe('SystemService.recordAccountRestrictionCase', () => {
  test('creates a user case, actions it and marks notice sent', async () => {
    const { connections, rec } = makeConnections()
    const service = new SystemService(connections)

    const result = await service.recordAccountRestrictionCase({
      userId: '42',
      reason: 'spam',
      source: 'model_assisted',
      automationRole: 'assisted',
      actorId: '9',
      noticeSent: true,
    })

    expect(rec.caseInserts[0]).toEqual(
      expect.objectContaining({
        source: 'model_assisted',
        targetType: 'user',
        targetId: '42',
        reason: 'spam',
        automationRole: 'assisted',
      })
    )
    // created + actioned events
    expect(rec.eventInserts.map((e) => e.eventType)).toEqual([
      'created',
      'actioned',
    ])
    expect(rec.eventInserts[1]).toEqual(
      expect.objectContaining({
        actorType: 'admin',
        actorId: '9',
        toStatus: 'action_taken',
        toOutcome: 'account_limited',
      })
    )
    // case actioned with notice sent
    expect(rec.caseUpdates[0].data).toEqual(
      expect.objectContaining({
        status: 'action_taken',
        outcome: 'account_limited',
        noticeState: 'sent',
      })
    )
    expect(result.status).toBe('action_taken')
  })

  test('reuses the existing case and skips the created event', async () => {
    const { connections, rec } = makeConnections({
      existingCase: {
        id: '7',
        status: 'action_taken',
        outcome: 'account_limited',
        noticeState: 'sent',
      },
    })
    const service = new SystemService(connections)

    await service.recordAccountRestrictionCase({
      userId: '42',
      reason: 'spam',
      source: 'model_assisted',
    })

    expect(rec.eventInserts.map((e) => e.eventType)).toEqual(['actioned'])
  })
})

describe('SystemService.resolveAccountRestrictionCase', () => {
  test('resolves the open case as restored with a restored event', async () => {
    const { connections, rec } = makeConnections({
      existingCase: {
        id: '7',
        status: 'action_taken',
        outcome: 'account_limited',
      },
    })
    const service = new SystemService(connections)

    const result = await service.resolveAccountRestrictionCase({
      userId: '42',
      actorId: '9',
    })

    expect(rec.caseUpdates[0].data).toEqual(
      expect.objectContaining({ status: 'resolved', outcome: 'restored' })
    )
    expect(rec.eventInserts[0]).toEqual(
      expect.objectContaining({
        eventType: 'restored',
        actorType: 'admin',
        actorId: '9',
        fromOutcome: 'account_limited',
        toOutcome: 'restored',
      })
    )
    expect(result?.status).toBe('resolved')
  })

  test('is a no-op when no open case exists (pre-recording freezes)', async () => {
    const { connections, rec } = makeConnections()
    const service = new SystemService(connections)

    const result = await service.resolveAccountRestrictionCase({
      userId: '42',
    })

    expect(result).toBeNull()
    expect(rec.eventInserts).toHaveLength(0)
    expect(rec.caseUpdates).toHaveLength(0)
  })
})
