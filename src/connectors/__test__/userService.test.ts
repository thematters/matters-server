import { UserService } from 'connectors'

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
