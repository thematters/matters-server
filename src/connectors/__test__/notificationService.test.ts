import type { Connections } from 'definitions'

import { MONTH } from 'common/enums'
import { NotificationService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let notificationService: NotificationService
const recipientId = '1'

beforeAll(async () => {
  connections = await genConnections()
  notificationService = new NotificationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('find notice', () => {
  test('find many notices', async () => {
    const notices = await notificationService.findByUser({
      userId: recipientId,
    })
    expect(notices.length).toBeGreaterThan(5)
  })
})

describe('update notices', () => {
  test('markAllNoticesAsRead', async () => {
    const notices = await connections.knex
      .select()
      .where({ recipientId, unread: true })
      .from('notice')
    expect(notices.length).not.toBe(0)

    await notificationService.markAllNoticesAsRead(recipientId)

    const readNotices = await connections.knex
      .select()
      .where({ recipientId, unread: true })
      .from('notice')
    expect(readNotices.length).toBe(0)
  })
})

describe('query notices with onlyRecent flag', () => {
  beforeAll(async () => {
    const notices = await notificationService.findByUser({
      userId: recipientId,
    })
    const oldNoticeId = notices[0].id
    const recentNoticeId = notices[1].id
    await connections.knex
      .update({ createdAt: '2019-01-01', updatedAt: '2019-01-01' })
      .where({ id: oldNoticeId })
      .from('notice')
    const fiveMonthAgo = new Date(Date.now() - MONTH * 5)
    await connections.knex
      .update({ createdAt: fiveMonthAgo, updatedAt: fiveMonthAgo })
      .where({ id: recentNoticeId })
      .from('notice')
  })
  test('countNotice', async () => {
    const count1 = await notificationService.countNotice({
      userId: recipientId,
    })
    const count2 = await notificationService.countNotice({
      userId: recipientId,
      onlyRecent: true,
    })
    expect(count1 - count2).toBe(1)
  })
  test('findByUser', async () => {
    const notices1 = await notificationService.findByUser({
      userId: recipientId,
    })
    const notices2 = await notificationService.findByUser({
      userId: recipientId,
      onlyRecent: true,
    })
    expect(notices1.length - notices2.length).toBe(1)
  })
})
