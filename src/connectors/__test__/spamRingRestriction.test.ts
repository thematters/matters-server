import type { Connections } from '#definitions/index.js'

import { FEATURE_FLAG, FEATURE_NAME } from '#common/enums/index.js'
import { AtomService } from '../atomService.js'
import { SpamRingService } from '../spamRingService.js'
import { SystemService } from '../systemService.js'
import { UserService } from '../userService.js'
import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let spamRingService: SpamRingService
let systemService: SystemService
let userService: UserService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  spamRingService = new SpamRingService(connections)
  systemService = new SystemService(connections)
  userService = new UserService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const setFlag = (flag: keyof typeof FEATURE_FLAG) =>
  systemService.setFeatureFlag({
    name: FEATURE_NAME.spam_ring_restriction,
    flag,
  })

const spamRingRestrictions = async (userId: string) =>
  atomService.findMany({
    table: 'user_restriction',
    where: { userId, type: 'spamRing' },
  })

beforeEach(async () => {
  await atomService.deleteMany({ table: 'spam_ring_event' })
  await atomService.deleteMany({ table: 'spam_ring_member' })
  await atomService.deleteMany({ table: 'spam_ring' })
  await connections.knex('user_restriction').where({ type: 'spamRing' }).del()
})

describe('spam-ring detection-time restrictions', () => {
  test('flag off: upsert writes no restrictions (zero diff)', async () => {
    await setFlag(FEATURE_FLAG.off)
    await spamRingService.upsertCandidates([
      { fingerprint: 'fp-off', memberUserIds: ['2', '3'], nAuthors: 2 },
    ])
    expect(await spamRingRestrictions('2')).toHaveLength(0)
    expect(await spamRingRestrictions('3')).toHaveLength(0)
  })

  test('flag on: upsert restricts each member once (idempotent)', async () => {
    await setFlag(FEATURE_FLAG.on)
    await spamRingService.upsertCandidates([
      { fingerprint: 'fp-on', memberUserIds: ['2', '3'], nAuthors: 2 },
    ])
    expect(await spamRingRestrictions('2')).toHaveLength(1)
    expect(await spamRingRestrictions('3')).toHaveLength(1)

    // re-upsert the same ring must not duplicate the restriction
    await spamRingService.upsertCandidates([
      { fingerprint: 'fp-on', memberUserIds: ['2', '3'], nAuthors: 2 },
    ])
    expect(await spamRingRestrictions('2')).toHaveLength(1)
  })

  test('dismiss lifts the members restrictions', async () => {
    await setFlag(FEATURE_FLAG.on)
    const { rings } = await spamRingService.upsertCandidates([
      { fingerprint: 'fp-dismiss', memberUserIds: ['2', '3'], nAuthors: 2 },
    ])
    expect(await spamRingRestrictions('2')).toHaveLength(1)

    await spamRingService.dismissRing({ ringId: rings[0].id, actorId: '6' })
    expect(await spamRingRestrictions('2')).toHaveLength(0)
    expect(await spamRingRestrictions('3')).toHaveLength(0)
  })

  test('dismiss keeps restriction for a member still in another pending ring', async () => {
    await setFlag(FEATURE_FLAG.on)
    const { rings: ringsA } = await spamRingService.upsertCandidates([
      { fingerprint: 'fp-a', memberUserIds: ['2', '3'], nAuthors: 2 },
    ])
    const { rings: ringsB } = await spamRingService.upsertCandidates([
      // user 2 is shared across both rings
      { fingerprint: 'fp-b', memberUserIds: ['2'], nAuthors: 1 },
    ])
    expect(ringsA[0].id).not.toBe(ringsB[0].id)
    expect(await spamRingRestrictions('2')).toHaveLength(1)

    // dismissing ring A must NOT unhide user 2 — ring B still flags them
    await spamRingService.dismissRing({ ringId: ringsA[0].id, actorId: '6' })
    expect(await spamRingRestrictions('2')).toHaveLength(1)
    // user 3 was only in ring A, so their restriction is lifted
    expect(await spamRingRestrictions('3')).toHaveLength(0)
  })

  test('restore (unfreeze ring) lifts restrictions of members frozen by it', async () => {
    await setFlag(FEATURE_FLAG.on)
    const { rings } = await spamRingService.upsertCandidates([
      { fingerprint: 'fp-restore', memberUserIds: ['4'], nAuthors: 1 },
    ])
    const ringId = rings[0].id
    await spamRingService.freezeRing({ ringId, actorId: '6', userService })
    expect(await spamRingRestrictions('4')).toHaveLength(1)

    await spamRingService.unfreezeRing({ ringId, actorId: '6', userService })
    expect(await spamRingRestrictions('4')).toHaveLength(0)
    // clean up the state change freeze/unfreeze left on the user
    await atomService.update({
      table: 'user',
      where: { id: '4' },
      data: { state: 'active' },
    })
    await userService.revertUserContentSpamMarks('4')
  })
})
