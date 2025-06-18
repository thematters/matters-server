import type { Connections, User, Notice } from '#definitions/index.js'
import type { Knex } from 'knex'

import { NOTICE_TYPE, LANGUAGE } from '#common/enums/index.js'
import { DailySummaryEmailService, AtomService } from '#connectors/index.js'
import { jest } from '@jest/globals'
import { v4 as uuidv4 } from 'uuid'

import { genConnections, closeConnections } from './utils.js'

const mockMailService = {
  send: jest.fn(),
}

let connections: Connections
let knex: Knex
let dailySummaryEmailService: DailySummaryEmailService
let atomService: AtomService
let testUserId: string

beforeAll(async () => {
  connections = await genConnections()
  knex = connections.knex
  dailySummaryEmailService = new DailySummaryEmailService(
    connections,
    mockMailService as any
  )
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

beforeEach(async () => {
  // Clean up test data
  await atomService.deleteMany({ table: 'notice_entity' })
  await atomService.deleteMany({ table: 'notice_actor' })
  await atomService.deleteMany({ table: 'notice' })
  await atomService.deleteMany({ table: 'notice_detail' })

  // Clear mail service mock
  mockMailService.send.mockClear()

  // Use seed user for testing
  testUserId = '1' // test1 user from seeds
})

describe('DailySummaryEmailService', () => {
  describe('findDailySummaryUsers', () => {
    test('finds users with unread notifications and email settings enabled', async () => {
      // Create a notice for the test user within the last day
      await createTestNotice(testUserId, NOTICE_TYPE.user_new_follower)

      // Enable email notifications for the user
      await knex('user_notify_setting')
        .where({ user_id: testUserId })
        .update({ enable: true, email: true })

      const users = await dailySummaryEmailService.findDailySummaryUsers()

      expect(users.length).toBeGreaterThan(0)
      expect(users.some((user: User) => user.id === testUserId)).toBe(true)
    })

    test('excludes users with email notifications disabled', async () => {
      // Create a notice for the test user
      await createTestNotice(testUserId, NOTICE_TYPE.user_new_follower)

      // Disable email notifications
      await knex('user_notify_setting')
        .where({ user_id: testUserId })
        .update({ enable: false, email: false })

      const users = await dailySummaryEmailService.findDailySummaryUsers()

      expect(users.some((user: User) => user.id === testUserId)).toBe(false)
    })

    test('excludes users without recent notifications', async () => {
      // Create an old notice (older than 1 day)
      await createTestNotice(
        testUserId,
        NOTICE_TYPE.user_new_follower,
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      )

      // Enable email notifications
      await knex('user_notify_setting')
        .where({ user_id: testUserId })
        .update({ enable: true, email: true })

      const users = await dailySummaryEmailService.findDailySummaryUsers()

      expect(users.some((user: User) => user.id === testUserId)).toBe(false)
    })
  })

  describe('findDailySummaryNoticesByUser', () => {
    test('finds recent unread notices for a user', async () => {
      // Create test notices
      await createTestNotice(testUserId, NOTICE_TYPE.user_new_follower)
      await createTestNotice(testUserId, NOTICE_TYPE.article_new_appreciation)

      const notices =
        await dailySummaryEmailService.findDailySummaryNoticesByUser(testUserId)

      expect(notices.length).toBeGreaterThan(0)
      expect(
        notices.some((notice) => notice.type === NOTICE_TYPE.user_new_follower)
      ).toBe(true)
      expect(
        notices.some(
          (notice) => notice.type === NOTICE_TYPE.article_new_appreciation
        )
      ).toBe(true)
    })

    test('excludes notices older than 1 day', async () => {
      // Create old notice
      const oldDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      await createTestNotice(testUserId, NOTICE_TYPE.user_new_follower, oldDate)

      const notices =
        await dailySummaryEmailService.findDailySummaryNoticesByUser(testUserId)

      expect(notices.length).toBe(0)
    })

    test('excludes read notices', async () => {
      // Create notice and mark as read
      const notice = await createTestNotice(
        testUserId,
        NOTICE_TYPE.user_new_follower
      )
      await knex('notice').where({ id: notice.id }).update({ unread: false })

      const notices =
        await dailySummaryEmailService.findDailySummaryNoticesByUser(testUserId)

      expect(notices.length).toBe(0)
    })

    test('includes only valid notice types', async () => {
      // Create notices with both valid and invalid types
      await createTestNotice(testUserId, NOTICE_TYPE.user_new_follower) // valid
      await createTestNotice(testUserId, 'official_announcement' as any) // invalid for daily summary

      const notices =
        await dailySummaryEmailService.findDailySummaryNoticesByUser(testUserId)

      expect(notices.length).toBe(1)
      expect(notices[0].type).toBe(NOTICE_TYPE.user_new_follower)
    })

    test('deduplicates notices with same type, actors, and entities', async () => {
      // Create duplicate notices
      await createTestNotice(
        testUserId,
        NOTICE_TYPE.user_new_follower,
        undefined,
        '2'
      ) // actor id 2
      await createTestNotice(
        testUserId,
        NOTICE_TYPE.user_new_follower,
        undefined,
        '2'
      ) // same actor

      const notices =
        await dailySummaryEmailService.findDailySummaryNoticesByUser(testUserId)

      expect(notices.length).toBe(1)
    })
  })

  describe('sendDailySummaryEmails', () => {
    test('sends email to users with notifications', async () => {
      // Setup user with verified email and notifications
      await knex('user').where({ id: testUserId }).update({
        email: 'test@example.com',
        email_verified: true,
        language: LANGUAGE.zh_hant,
      })

      await knex('user_notify_setting')
        .where({ user_id: testUserId })
        .update({ enable: true, email: true })

      // Create test notice
      await createTestNotice(testUserId, NOTICE_TYPE.user_new_follower)

      await dailySummaryEmailService.sendDailySummaryEmails()

      expect(mockMailService.send).toHaveBeenCalledTimes(1)
      expect(mockMailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Matters<ask@matters.town>',
          templateId: expect.any(String),
          personalizations: expect.arrayContaining([
            expect.objectContaining({
              to: 'test@example.com',
              dynamicTemplateData: expect.objectContaining({
                subject: expect.stringContaining('Matters 日報'),
                recipient: expect.objectContaining({
                  displayName: expect.any(String),
                }),
                notices: expect.any(Object),
              }),
            }),
          ]),
        }),
        false
      )
    })

    test('skips users without verified email', async () => {
      // Setup user without verified email
      await knex('user').where({ id: testUserId }).update({
        email: 'test@example.com',
        email_verified: false,
      })

      // Create test notice
      await createTestNotice(testUserId, NOTICE_TYPE.user_new_follower)

      await dailySummaryEmailService.sendDailySummaryEmails()

      expect(mockMailService.send).not.toHaveBeenCalled()
    })

    test('skips users without any notices', async () => {
      // Setup user with verified email but no notices
      await knex('user').where({ id: testUserId }).update({
        email: 'test@example.com',
        email_verified: true,
      })

      await knex('user_notify_setting')
        .where({ user_id: testUserId })
        .update({ enable: true, email: true })

      await dailySummaryEmailService.sendDailySummaryEmails()

      expect(mockMailService.send).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('handles database connection errors', async () => {
      // Test with invalid user ID
      const notices =
        await dailySummaryEmailService.findDailySummaryNoticesByUser('0')
      expect(notices).toEqual([])
    })
  })
})

// Helper function to create test notices
async function createTestNotice(
  recipientId: string,
  noticeType: NOTICE_TYPE,
  date: Date = new Date(),
  actorId: string = '2'
): Promise<Notice> {
  // Create notice
  const noticeDetail = await atomService.create({
    table: 'notice_detail',
    data: {
      noticeType: noticeType,
      createdAt: date,
    },
  })
  const notice = await atomService.create({
    table: 'notice',
    data: {
      recipientId: recipientId,
      unread: true,
      deleted: false,
      uuid: uuidv4(),
      noticeDetailId: noticeDetail.id,
      createdAt: date,
      updatedAt: date,
    },
  })

  // Create notice detail

  // Create notice actor
  await atomService.create({
    table: 'notice_actor',
    data: {
      noticeId: notice.id,
      actorId: actorId,
      createdAt: date,
    },
  })

  return notice
}
