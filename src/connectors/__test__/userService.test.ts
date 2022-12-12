import { USER_ACTION } from 'common/enums'
import { UserService } from 'connectors'
import { GQLSearchExclude } from 'definitions'

import { createDonationTx } from './utils'

const TEST_RECIPIENT_ID = '9'
const userService = new UserService()

describe('countDonators', () => {
  beforeEach(async () => {
    await userService
      .knex('transaction')
      .where({ recipientId: TEST_RECIPIENT_ID })
      .del()
  })
  test('not existed recipientId', async () => {
    const recipientId = '0'
    const result = await userService.topDonators(recipientId)
    expect(result).toEqual([])
  })
  test('only one donator', async () => {
    const recipientId = TEST_RECIPIENT_ID
    await createDonationTx({ recipientId, senderId: '2' })
    const result = await userService.topDonators(recipientId)
    expect(result).toEqual([{ senderId: '2', count: 1 }])
  })
  test('donators is ordered', async () => {
    const recipientId = TEST_RECIPIENT_ID
    await createDonationTx({ recipientId, senderId: '2' })
    await createDonationTx({ recipientId, senderId: '2' })
    await createDonationTx({ recipientId, senderId: '3' })
    // 1st ordered by donations count desc
    const result = await userService.topDonators(recipientId)
    expect(result).toEqual([
      { senderId: '2', count: 2 },
      { senderId: '3', count: 1 },
    ])
    // 2rd ordered by donations time desc
    await createDonationTx({ recipientId, senderId: '3' })
    const result2 = await userService.topDonators(recipientId)
    expect(result2).toEqual([
      { senderId: '3', count: 2 },
      { senderId: '2', count: 2 },
    ])
  })
  test('call with range', async () => {
    const recipientId = TEST_RECIPIENT_ID
    const tx1 = await createDonationTx({ recipientId, senderId: '2' })
    const tx2 = await createDonationTx({ recipientId, senderId: '2' })
    const result = await userService.topDonators(recipientId, {
      start: tx1.createdAt,
      end: tx2.createdAt,
    })
    expect(result).toEqual([{ senderId: '2', count: 1 }])
  })
  test('call with pagination', async () => {
    const recipientId = TEST_RECIPIENT_ID
    await createDonationTx({ recipientId, senderId: '2' })
    await createDonationTx({ recipientId, senderId: '3' })
    await createDonationTx({ recipientId, senderId: '4' })
    const result1 = await userService.topDonators(recipientId, undefined, {
      skip: 1,
    })
    expect(result1).toEqual([
      { senderId: '3', count: 1 },
      { senderId: '2', count: 1 },
    ])
    const result2 = await userService.topDonators(recipientId, undefined, {
      take: 1,
    })
    expect(result2).toEqual([{ senderId: '4', count: 1 }])
    const result3 = await userService.topDonators(recipientId, undefined, {
      take: 1,
      skip: 1,
    })
    expect(result3).toEqual([{ senderId: '3', count: 1 }])
    // edge cases
    const result4 = await userService.topDonators(recipientId, undefined, {
      take: 0,
    })
    expect(result4).toEqual([])
    const result5 = await userService.topDonators(recipientId, undefined, {
      skip: 3,
    })
    expect(result5).toEqual([])
  })
})

describe('countDonators', () => {
  beforeEach(async () => {
    await userService
      .knex('transaction')
      .where({ recipientId: TEST_RECIPIENT_ID })
      .del()
  })
  test('not existed recipientId', async () => {
    const recipientId = '0'
    const count = await userService.countDonators(recipientId)
    expect(count).toBe(0)
  })
  test('exsited recpientId but not donators', async () => {
    const recipientId = TEST_RECIPIENT_ID
    const count = await userService.countDonators(recipientId)
    expect(count).toBe(0)
  })
  test('count donators', async () => {
    const recipientId = TEST_RECIPIENT_ID

    await createDonationTx({ recipientId, senderId: '2' })

    const count1 = await userService.countDonators(recipientId)
    expect(count1).toBe(1)

    // distinct donators
    await createDonationTx({ recipientId, senderId: '2' })
    const count2 = await userService.countDonators(recipientId)
    expect(count2).toBe(1)
    const tx3 = await createDonationTx({ recipientId, senderId: '3' })
    const count3 = await userService.countDonators(recipientId)
    expect(count3).toBe(2)

    // count with range
    const tx4 = await createDonationTx({ recipientId, senderId: '4' })
    const count4 = await userService.countDonators(recipientId)
    expect(count4).toBe(3)
    const count5 = await userService.countDonators(recipientId, {
      start: tx3.createdAt,
      end: tx4.createdAt,
    })
    expect(count5).toBe(1)
  })
})

describe('searchV1', () => {
  test('empty result', async () => {
    const res = await userService.searchV1({
      key: 'not-exist',
      take: 1,
      skip: 0,
    })
    expect(res.totalCount).toBe(0)
  })
  test('prefer exact match', async () => {
    const res = await userService.searchV1({ key: 'test1', take: 3, skip: 0 })
    expect(res.totalCount).toBe(2)
    expect(res.nodes[0].userName).toBe('test1')
  })
  test('prefer more num_followers', async () => {
    const getNumFollowers = async (id: string) =>
      (
        await userService
          .knex('search_index.user')
          .where({ id })
          .select('num_followers')
      )[0].numFollowers || 0
    const res = await userService.searchV1({ key: 'test', take: 3, skip: 0 })
    expect(await getNumFollowers(res.nodes[0].id)).toBeGreaterThanOrEqual(
      await getNumFollowers(res.nodes[1].id)
    )
    expect(await getNumFollowers(res.nodes[1].id)).toBeGreaterThanOrEqual(
      await getNumFollowers(res.nodes[2].id)
    )
  })
  test('handle prefix @,＠', async () => {
    const res = await userService.searchV1({ key: '@test1', take: 3, skip: 0 })
    expect(res.totalCount).toBe(2)
    expect(res.nodes[0].userName).toBe('test1')
    const res2 = await userService.searchV1({
      key: '＠test1',
      take: 3,
      skip: 0,
    })
    expect(res2.totalCount).toBe(2)
    expect(res2.nodes[0].userName).toBe('test1')
  })
  test('handle empty string', async () => {
    const res1 = await userService.searchV1({ key: '', take: 3, skip: 0 })
    expect(res1.totalCount).toBe(0)
    const res2 = await userService.searchV1({ key: '@', take: 3, skip: 0 })
    expect(res2.totalCount).toBe(0)
  })
  test('handle blocked', async () => {
    await userService
      .knex('action_user')
      .insert({ userId: '2', action: USER_ACTION.block, targetId: '1' })

    const res = await userService.searchV1({ key: 'test2', take: 3, skip: 0 })
    expect(res.totalCount).toBe(1)

    const res2 = await userService.searchV1({
      key: 'test2',
      take: 3,
      skip: 0,
      exclude: GQLSearchExclude.blocked,
      viewerId: '1',
    })
    expect(res2.totalCount).toBe(0)

describe('updateVisitedAt', () => {
  test('do not update during threshold', async () => {
    const id = '1'
    const { visitedAt: last } = await userService
      .knex('public.user')
      .select('visited_at')
      .where({ id })
      .first()
    await userService.updateVisitedAt(id)
    const { visitedAt: now } = await userService
      .knex('public.user')
      .select('visited_at')
      .where({ id })
      .first()
    expect(last).toStrictEqual(now)
    await userService.updateVisitedAt(id)
  })
  test('update beyond threshold', async () => {
    const id = '2'
    const { visitedAt: last } = await userService
      .knex('public.user')
      .select('visited_at')
      .where({ id })
      .first()
    await userService.updateVisitedAt(id, 1)
    const { visitedAt: now } = await userService
      .knex('public.user')
      .select('visited_at')
      .where({ id })
      .first()
    expect(last).not.toStrictEqual(now)
  })
  test('right totalCount with take and skip', async () => {
    const res1 = await userService.searchV1({ key: 'test', take: 10, skip: 0 })
    expect(res1.nodes.length).toBe(6)
    expect(res1.totalCount).toBe(6)
    const res2 = await userService.searchV1({ key: 'test', take: 1, skip: 0 })
    expect(res2.nodes.length).toBe(1)
    expect(res2.totalCount).toBe(6)
    const res3 = await userService.searchV1({ key: 'test', take: 10, skip: 1 })
    expect(res3.nodes.length).toBe(5)
    expect(res3.totalCount).toBe(6)
  })
})
