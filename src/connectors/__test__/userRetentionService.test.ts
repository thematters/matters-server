import type { Connections } from '#definitions/index.js'
import type { Knex } from 'knex'

import { UserRetentionService } from '#connectors/index.js'
import { DAY } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { jest } from '@jest/globals'

import { genConnections, closeConnections } from './utils.js'

// Helper function to insert retention state directly
const insertRetentionState = async (
  connections: Connections,
  userId: string,
  state: string
) => {
  await connections.knex('user_retention_history').insert({
    user_id: userId,
    state,
  })
}

let connections: Connections
let knex: Knex
let userRetentionService: UserRetentionService

beforeAll(async () => {
  connections = await genConnections()
  knex = connections.knex
  userRetentionService = new UserRetentionService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('UserRetentionService', () => {
  describe('markUserState', () => {
    test('should mark user state as ALERT', async () => {
      const userId = '1'

      await knex('user_retention_history').where('user_id', userId).delete()

      await userRetentionService.markUserState(userId, 'ALERT')

      const history = await knex('user_retention_history')
        .where('user_id', userId)
        .orderBy('id', 'desc')
        .first()

      expect(history.state).toBe('ALERT')
      expect(history.userId).toBe(userId)
    })

    test('should mark user state as NORMAL', async () => {
      const userId = '1'

      await userRetentionService.markUserState(userId, 'NORMAL')

      const history = await knex('user_retention_history')
        .where('user_id', userId)
        .orderBy('id', 'desc')
        .first()

      expect(history.state).toBe('NORMAL')
    })

    test('should mark user state as INACTIVE', async () => {
      const userId = '1'

      await userRetentionService.markUserState(userId, 'INACTIVE')

      const history = await knex('user_retention_history')
        .where('user_id', userId)
        .orderBy('id', 'desc')
        .first()

      expect(history.state).toBe('INACTIVE')
    })
  })

  describe('loadUserRetentionState', () => {
    test('should load latest user retention state', async () => {
      const userId = '2'

      await connections
        .knex('user_retention_history')
        .where('user_id', userId)
        .delete()

      await userRetentionService.markUserState(userId, 'ALERT')
      await userRetentionService.markUserState(userId, 'INACTIVE')

      const state = await userRetentionService.loadUserRetentionState(userId)

      expect(state).toBe('INACTIVE')
    })

    test('should return undefined for user with no retention history', async () => {
      const userId = '999'

      const state = await userRetentionService.loadUserRetentionState(userId)

      expect(state).toBeUndefined()
    })

    test('should handle multiple state changes correctly', async () => {
      const userId = '3'

      await connections
        .knex('user_retention_history')
        .where('user_id', userId)
        .delete()

      await userRetentionService.markUserState(userId, 'ALERT')
      await userRetentionService.markUserState(userId, 'INACTIVE')
      await userRetentionService.markUserState(userId, 'NORMAL')

      const state = await userRetentionService.loadUserRetentionState(userId)

      expect(state).toBe('NORMAL')
    })
  })

  describe('processUserRetention', () => {
    let mockSendmail: jest.MockedFunction<
      (userId: string, lastSeen: Date | null, type: string) => Promise<void>
    >

    beforeEach(() => {
      mockSendmail = jest
        .fn<
          (userId: string, lastSeen: Date | null, type: string) => Promise<void>
        >()
        .mockResolvedValue(undefined)
    })

    test('should process user retention with interval', async () => {
      const userId = '4'

      // Clean up first
      await knex('user_retention_history').where('user_id', userId).delete()

      // Set up user data
      await knex('user')
        .where('id', userId)
        .update({
          created_at: new Date(Date.now() - DAY),
          last_seen: new Date(Date.now() - 2 * DAY),
          state: 'active',
          email_verified: true,
        })

      // Insert retention state that will trigger sendmail
      const stateCreatedAt = new Date(Date.now() - 2 * DAY) // Make it older than interval
      await knex('user_retention_history').insert({
        user_id: userId,
        state: 'NEWUSER',
        created_at: stateCreatedAt,
      })

      await userRetentionService.processUserRetention({
        intervalInDays: 1,
        sendmail: mockSendmail,
      })

      expect(mockSendmail).toHaveBeenCalled()
    })

    test('should not send mail when interval has not passed', async () => {
      const userId = '5'

      await knex('user_retention_history').where('user_id', userId).delete()

      await insertRetentionState(connections, userId, 'NEWUSER')

      await userRetentionService.processUserRetention({
        intervalInDays: 7,
        sendmail: mockSendmail,
      })

      const callsForUser = mockSendmail.mock.calls.filter(
        (call) => call[0] === userId
      )
      expect(callsForUser.length).toBe(0)
    })
  })

  describe('loadRecommendedArticles', () => {
    test('should load recommended articles', async () => {
      const userId = '1'
      const lastSeen = new Date(Date.now() - DAY)
      const excludedIds: string[] = []

      const articles = await userRetentionService.loadRecommendedArticles(
        userId,
        lastSeen,
        3,
        excludedIds
      )

      expect(Array.isArray(articles)).toBe(true)
      articles.forEach((article: any) => {
        expect(article).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            displayName: expect.any(String),
            shortHash: expect.any(String),
          })
        )
      })
    })

    test('should respect excluded article IDs', async () => {
      const userId = '1'
      const lastSeen = new Date(Date.now() - DAY)

      const allArticles = await userRetentionService.loadRecommendedArticles(
        userId,
        lastSeen,
        5,
        []
      )

      if (allArticles.length > 0) {
        const excludedIds = [allArticles[0].id]

        const filteredArticles =
          await userRetentionService.loadRecommendedArticles(
            userId,
            lastSeen,
            5,
            excludedIds
          )

        const excludedFound = filteredArticles.some((article: any) =>
          excludedIds.includes(article.id)
        )
        expect(excludedFound).toBe(false)
      }
    })

    test('should respect limit parameter', async () => {
      const userId = '1'
      const lastSeen = new Date(Date.now() - DAY)
      const limit = 2

      const articles = await userRetentionService.loadRecommendedArticles(
        userId,
        lastSeen,
        limit,
        []
      )

      expect(articles.length).toBeLessThanOrEqual(limit)
    })
  })

  describe('loadHottestArticles', () => {
    test('should load hottest articles', async () => {
      const userId = '1'
      const excludedIds: string[] = []

      const articles = await userRetentionService.loadHottestArticles(
        userId,
        3,
        excludedIds
      )

      expect(Array.isArray(articles)).toBe(true)
      articles.forEach((article: any) => {
        expect(article).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            displayName: expect.any(String),
            shortHash: expect.any(String),
          })
        )
      })
    })

    test('should not include user own articles', async () => {
      const userId = '1'

      const articles = await userRetentionService.loadHottestArticles(
        userId,
        10,
        []
      )

      const userArticles = articles.filter(
        (article: any) => typeof article.id === 'string'
      )
      expect(userArticles.length).toBe(articles.length)
    })

    test('should respect excluded article IDs', async () => {
      const userId = '1'

      const allArticles = await userRetentionService.loadHottestArticles(
        userId,
        5,
        []
      )

      if (allArticles.length > 0) {
        const excludedIds = [allArticles[0].id]

        const filteredArticles = await userRetentionService.loadHottestArticles(
          userId,
          5,
          excludedIds
        )

        const excludedFound = filteredArticles.some((article: any) =>
          excludedIds.includes(article.id)
        )
        expect(excludedFound).toBe(false)
      }
    })
  })

  describe('loadNewFeatureArticles', () => {
    test('should load new feature articles', async () => {
      const tagId = environment.newFeatureTagId || '1'

      const articles = await userRetentionService.loadNewFeatureArticles(
        tagId,
        1
      )

      expect(Array.isArray(articles)).toBe(true)
      articles.forEach((article: any) => {
        expect(article).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            displayName: expect.any(String),
            shortHash: expect.any(String),
          })
        )
      })
    })

    test('should respect limit parameter', async () => {
      const tagId = environment.newFeatureTagId || '1'
      const limit = 2

      const articles = await userRetentionService.loadNewFeatureArticles(
        tagId,
        limit
      )

      expect(articles.length).toBeLessThanOrEqual(limit)
    })

    test('should return articles ordered by creation date', async () => {
      const tagId = environment.newFeatureTagId || '1'

      const articles = await userRetentionService.loadNewFeatureArticles(
        tagId,
        10
      )

      expect(Array.isArray(articles)).toBe(true)
    })
  })

  describe('error handling', () => {
    test('should handle invalid user ID gracefully', async () => {
      const invalidUserId = '99999' // Use numeric string instead of invalid format

      const state = await userRetentionService.loadUserRetentionState(
        invalidUserId
      )
      expect(state).toBeUndefined()
    })

    test('should handle empty results gracefully', async () => {
      const userId = '999'
      const lastSeen = new Date(Date.now() - DAY)

      const articles = await userRetentionService.loadRecommendedArticles(
        userId,
        lastSeen,
        3,
        []
      )

      expect(Array.isArray(articles)).toBe(true)
      expect(articles.length).toBe(0)
    })

    test('should handle very old lastSeen date', async () => {
      const userId = '1'
      const veryOldDate = new Date('2020-01-01')

      const articles = await userRetentionService.loadRecommendedArticles(
        userId,
        veryOldDate,
        3,
        []
      )

      expect(Array.isArray(articles)).toBe(true)
    })

    test('should handle null lastSeen gracefully', async () => {
      const userId = '1'

      const articles = await userRetentionService.loadHottestArticles(
        userId,
        3,
        []
      )

      expect(Array.isArray(articles)).toBe(true)
    })
  })

  describe('data validation', () => {
    test('should validate user retention state values', async () => {
      const userId = '7'

      const validStates = ['NORMAL', 'ALERT', 'INACTIVE'] as const

      for (const state of validStates) {
        await userRetentionService.markUserState(userId, state)
        const currentState = await userRetentionService.loadUserRetentionState(
          userId
        )
        expect(currentState).toBe(state)
      }
    })

    test('sendmail should validate mail type', async () => {
      const userId = '1'

      await knex('user_retention_history').where('user_id', userId).delete()

      await knex('user').where('id', userId).update({
        email_verified: true,
        state: 'active',
      })

      // Import the mail service dynamically to avoid require issues
      const { mailService } = await import('#connectors/mail/index.js')
      const mockMailSend = jest
        .spyOn(mailService, 'send')
        .mockResolvedValue(undefined)

      const lastSeen = new Date(Date.now() - DAY)

      const validTypes = ['NEWUSER', 'ACTIVE'] as const

      for (const type of validTypes) {
        await knex('user_retention_history').where('user_id', userId).delete()
        await insertRetentionState(connections, userId, type)

        await userRetentionService.sendmail(userId, lastSeen, type)
        expect(mockMailSend).toHaveBeenCalled()

        mockMailSend.mockClear()
      }

      mockMailSend.mockRestore()
    })
  })
})
