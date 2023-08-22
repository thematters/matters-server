import { CACHE_PREFIX, USER_ACTION } from 'common/enums'
import { CacheService, UserService } from 'connectors'

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

describe('search', () => {
  test('empty result', async () => {
    const res = await userService.search({
      key: 'not-exist',
      take: 1,
      skip: 0,
    })
    expect(res.totalCount).toBe(0)
  })
  test('prefer exact match', async () => {
    const res = await userService.search({ key: 'test1', take: 3, skip: 0 })
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
    const res = await userService.search({ key: 'test', take: 3, skip: 0 })
    expect(await getNumFollowers(res.nodes[0].id)).toBeGreaterThanOrEqual(
      await getNumFollowers(res.nodes[1].id)
    )
    expect(await getNumFollowers(res.nodes[1].id)).toBeGreaterThanOrEqual(
      await getNumFollowers(res.nodes[2].id)
    )
  })
  test('handle prefix @,＠', async () => {
    const res = await userService.search({ key: '@test1', take: 3, skip: 0 })
    expect(res.totalCount).toBe(2)
    expect(res.nodes[0].userName).toBe('test1')
    const res2 = await userService.search({
      key: '＠test1',
      take: 3,
      skip: 0,
    })
    expect(res2.totalCount).toBe(2)
    expect(res2.nodes[0].userName).toBe('test1')
  })
  test('handle empty string', async () => {
    const res1 = await userService.search({ key: '', take: 3, skip: 0 })
    expect(res1.totalCount).toBe(0)
    const res2 = await userService.search({ key: '@', take: 3, skip: 0 })
    expect(res2.totalCount).toBe(0)
  })
  test('handle blocked', async () => {
    await userService
      .knex('action_user')
      .insert({ userId: '2', action: USER_ACTION.block, targetId: '1' })

    const res = await userService.search({ key: 'test2', take: 3, skip: 0 })
    expect(res.totalCount).toBe(1)

    const res2 = await userService.search({
      key: 'test2',
      take: 3,
      skip: 0,
      exclude: 'blocked',
      viewerId: '1',
    })
    expect(res2.totalCount).toBe(0)
  })
  test('right totalCount with take and skip', async () => {
    const res1 = await userService.search({ key: 'test', take: 10, skip: 0 })
    expect(res1.nodes.length).toBe(6)
    expect(res1.totalCount).toBe(6)
    const res2 = await userService.search({ key: 'test', take: 1, skip: 0 })
    expect(res2.nodes.length).toBe(1)
    expect(res2.totalCount).toBe(6)
    const res3 = await userService.search({ key: 'test', take: 10, skip: 1 })
    expect(res3.nodes.length).toBe(5)
    expect(res3.totalCount).toBe(6)
  })
})

describe('updateLastSeen', () => {
  const getLastseen = async (id: string) => {
    const { lastSeen } = await userService
      .knex('public.user')
      .select('last_seen')
      .where({ id })
      .first()
    return lastSeen
  }
  test('do not update during threshold', async () => {
    const id = '1'

    const last1 = await getLastseen(id)
    expect(last1).toBeNull()

    await userService.updateLastSeen(id, 1000)

    const last2 = await getLastseen(id)
    expect(last2).not.toBeNull()

    await userService.updateLastSeen(id, 1000)

    const last3 = await getLastseen(id)
    expect(last3).toStrictEqual(last2)
  })
  test('update beyond threshold', async () => {
    const id = '2'

    const last = await getLastseen(id)

    await userService.updateLastSeen(id, 1)

    const now = await getLastseen(id)
    expect(now).not.toStrictEqual(last)
  })
  test('caching', async () => {
    const cacheService = new CacheService(CACHE_PREFIX.USER_LAST_SEEN)
    const cacheGet = async (_id: string) =>
      // @ts-ignore
      cacheService.redis.get(cacheService.genKey({ id: _id }))
    const id = '3'

    await userService.updateLastSeen(id, 1000)
    const data1 = await cacheGet(id)
    expect(data1).toBeNull()

    await userService.updateLastSeen(id, 1000)
    const data2 = await cacheGet(id)
    expect(data2).not.toBeNull()
  })
})

describe('restrictions CRUD', () => {
  const userId = '1'
  const restriction1 = 'articleHottest'
  const restriction2 = 'articleNewest'

  test('get empty result', async () => {
    expect(await userService.findRestrictions(userId)).toEqual([])
  })

  test('update', async () => {
    // add a restriction
    await userService.updateRestrictions(userId, [restriction1])
    expect(
      (await userService.findRestrictions(userId)).map(({ type }) => type)
    ).toEqual([restriction1])

    // change restriction
    await userService.updateRestrictions(userId, [restriction2])
    expect(
      (await userService.findRestrictions(userId)).map(({ type }) => type)
    ).toEqual([restriction2])

    // add more restrictions
    await userService.updateRestrictions(userId, [restriction1, restriction2])
    expect(
      (await userService.findRestrictions(userId))
        .map(({ type }) => type)
        .sort()
    ).toEqual([restriction1, restriction2].sort())

    // remove all restrictions
    await userService.updateRestrictions(userId, [])
    expect(await userService.findRestrictions(userId)).toEqual([])
  })
  test('findRestrictedUsers', async () => {
    // no restricted users
    const [noUsers, zero] = await userService.findRestrictedUsersAndCount()
    expect(noUsers).toEqual([])
    expect(zero).toBe(0)

    // one restricted user
    await userService.updateRestrictions(userId, [restriction1])
    const [oneUser, one] = await userService.findRestrictedUsersAndCount()
    expect(oneUser.map(({ id }: { id: string }) => id)).toEqual([userId])
    expect(one).toBe(1)

    // multi restricted users, order by updated at desc
    const newRestrictedUserId = '2'
    await userService.updateRestrictions(newRestrictedUserId, [restriction1])
    const [users, count] = await userService.findRestrictedUsersAndCount()
    expect(users.map(({ id }: { id: string }) => id)).toEqual([
      newRestrictedUserId,
      userId,
    ])
    expect(count).toBe(2)

    // take
    const [takeUsers, takeCount] =
      await userService.findRestrictedUsersAndCount({ take: 1 })
    expect(takeUsers.map(({ id }: { id: string }) => id)).toEqual([
      newRestrictedUserId,
    ])
    expect(takeCount).toBe(2)

    // skip
    const [skipUser, skipCount] = await userService.findRestrictedUsersAndCount(
      { skip: 1 }
    )
    expect(skipUser.map(({ id }: { id: string }) => id)).toEqual([userId])
    expect(skipCount).toBe(2)
  })
})

describe('totalPinnedWorks', () => {
  test('get 0 pinned works', async () => {
    const res = await userService.totalPinnedWorks('1')
    expect(res).toBe(0)
  })
  test('get 1 pinned works', async () => {
    await userService
      .knex('collection')
      .insert({ authorId: '1', title: 'test', pinned: true })
    const res = await userService.totalPinnedWorks('1')
    expect(res).toBe(1)
  })
})

describe('getOrCreateUserBySocialAccount', () => {
  const twitterUserInfo = {
    id: '1',
    username: 'testtwitterusername',
  }
  test('create and get user by social account', async () => {
    const createdUser = await userService.getOrCreateUserBySocialAccount({
      socialAccountId: twitterUserInfo.id,
      userName: twitterUserInfo.username,
      type: 'Twitter',
    })
    expect(createdUser.id).toBeDefined()
    expect(createdUser.userName).toBeNull()

    const user = await userService.getOrCreateUserBySocialAccount({
      socialAccountId: twitterUserInfo.id,
      userName: twitterUserInfo.username,
      type: 'Twitter',
    })
    expect(user.id).toBe(createdUser.id)
  })
})
