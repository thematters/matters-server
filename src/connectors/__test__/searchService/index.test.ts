import type { Connections } from '#definitions/index.js'

import { SearchService, AtomService } from '#connectors/index.js'
import { USER_STATE } from '#common/enums/index.js'

import { genConnections, closeConnections } from '../utils.js'

describe('SearchService', () => {
  let connections: Connections
  let searchService: SearchService
  let atomService: AtomService

  beforeAll(async () => {
    connections = await genConnections()
    searchService = new SearchService(connections)
    atomService = new AtomService(connections)
  }, 30000)

  afterAll(async () => {
    await closeConnections(connections)
  })

  beforeEach(async () => {
    // Clean up search index before each test
    await connections.knexSearch('search_index.user').del()
  })

  describe('indexUsers', () => {
    test('handles empty userIds array', async () => {
      await expect(searchService.indexUsers([])).resolves.not.toThrow()
    })

    test('deduplicates userIds', async () => {
      const userIds = ['1', '1', '1'] // Duplicate IDs
      await searchService.indexUsers(userIds)

      // Verify only one record was created
      const indexedUsers = await connections
        .knexSearch('search_index.user')
        .where({ id: '1' })
        .select('*')
      expect(indexedUsers).toHaveLength(1)
    })

    test('indexes user data with follower counts', async () => {
      // Use seed data users
      const user1Id = '1' // Matty
      const user2Id = '2' // Test User

      await searchService.indexUsers([user1Id, user2Id])

      // Verify indexed data
      const indexedUser1 = await connections
        .knexSearch('search_index.user')
        .where({ id: user1Id })
        .first()

      expect(indexedUser1).toBeDefined()
      expect(indexedUser1.state).toBe(USER_STATE.active)
      // from db/seeds/11_action_user.js
      expect(indexedUser1.numFollowers).toBe(2)

      const indexedUser2 = await connections
        .knexSearch('search_index.user')
        .where({ id: user2Id })
        .first()

      expect(indexedUser2).toBeDefined()
      // from db/seeds/11_action_user.js
      expect(indexedUser2.numFollowers).toBe(2)
    })

    test('updates existing indexed user data', async () => {
      const userId = '2' // Test User

      // First index
      await searchService.indexUsers([userId])

      // Update user data
      await atomService.update({
        table: 'user',
        where: { id: userId },
        data: {
          displayName: 'Updated User',
          description: 'Updated description',
        },
      })

      // Re-index
      await searchService.indexUsers([userId])

      // Verify updated data
      const indexedUser = await connections
        .knexSearch('search_index.user')
        .where({ id: userId })
        .first()

      expect(indexedUser).toBeDefined()
      expect(indexedUser.displayName).toBe('updated user') // Lowercase
      expect(indexedUser.description).toBe('updated description') // Lowercase
    })
  })
})
