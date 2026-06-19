import { jest } from '@jest/globals'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import dismissSpamRing from '#mutations/user/dismissSpamRing.js'
import freezeSpamRing from '#mutations/user/freezeSpamRing.js'
import unfreezeSpamRing from '#mutations/user/unfreezeSpamRing.js'
import upsertSpamRingCandidates from '#mutations/user/upsertSpamRingCandidates.js'

const ringGlobalId = (id: string) =>
  toGlobalId({ type: NODE_TYPES.SpamRing, id })

const makeContext = (viewer: any = { id: '9' }) => {
  const userService = { __sentinel: 'userService' }
  return {
    viewer,
    dataSources: {
      userService,
      spamRingService: {
        freezeRing: jest.fn(async () => ({ ring: {}, frozen: [], skipped: [] })),
        unfreezeRing: jest.fn(async () => ({ ring: {}, unbanned: [], skipped: [] })),
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

  test('freezeSpamRing rejects when viewer has no id', async () => {
    await expect(
      (freezeSpamRing as any)(
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
    const arg = (
      ctx.dataSources.spamRingService.upsertCandidates as any
    ).mock.calls[0][0]
    expect(arg[0].fingerprint).toBe('fp1')
    expect(arg[0].memberUserIds).toEqual(['u1', 'u2'])
    expect(arg[0].memberUserNames).toBeUndefined()
    expect(arg[0].newAccountRatio).toBeUndefined()
    expect(arg[0].memberEvidence).toEqual({ u1: { a: 1 } })
  })
})
