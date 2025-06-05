import type { Connections } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../utils.js'

const SEARCH = /* GraphQL */ `
  query Search($input: SearchInput!) {
    search(input: $input) {
      edges {
        node {
          id
          ... on Article {
            title
            content
          }
          ... on User {
            userName
            displayName
          }
          ... on Tag {
            content
          }
        }
      }
      totalCount
    }
  }
`

describe('search resolver', () => {
  let connections: Connections
  let server: any

  beforeAll(async () => {
    connections = await genConnections()
    server = await testClient({
      connections,
      isAuth: true,
    })
  }, 30000)

  afterAll(async () => {
    await closeConnections(connections)
  })

  describe('Article search', () => {
    test('should search articles with key', async () => {
      const { data, errors } = await server.executeOperation({
        query: SEARCH,
        variables: {
          input: {
            type: 'Article',
            key: 'test',
            first: 10,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.search.totalCount).toBeGreaterThan(0)
    })

    test('should search articles with author filter', async () => {
      const { data, errors } = await server.executeOperation({
        query: SEARCH,
        variables: {
          input: {
            type: 'Article',
            key: 'test',
            first: 10,
            filter: {
              authorId: toGlobalId({
                type: NODE_TYPES.User,
                id: '1', // Using seed user ID
              }),
            },
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.search.totalCount).toBeGreaterThan(0)
    })
  })

  describe('User search', () => {
    test('should search users with key', async () => {
      const { data, errors } = await server.executeOperation({
        query: SEARCH,
        variables: {
          input: {
            type: 'User',
            key: 'test',
            first: 10,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.search.totalCount).toBeGreaterThan(0)
    })
  })

  describe('Tag search', () => {
    test('should search tags with key', async () => {
      const { data, errors } = await server.executeOperation({
        query: SEARCH,
        variables: {
          input: {
            type: 'Tag',
            key: 'test',
            first: 10,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.search.totalCount).toBeGreaterThan(0)
    })
  })

  describe('Error handling', () => {
    test('should handle invalid search type', async () => {
      const { errors } = await server.executeOperation({
        query: SEARCH,
        variables: {
          input: {
            type: 'InvalidType',
            key: 'test',
            first: 10,
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
    })

    test('should handle empty search key', async () => {
      const { data, errors } = await server.executeOperation({
        query: SEARCH,
        variables: {
          input: {
            type: 'Article',
            key: '',
            first: 10,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.search.totalCount).toBe(0)
    })
  })
})
