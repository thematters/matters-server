import type { Connections } from '#definitions/index.js'

import _difference from 'lodash/difference.js'
import _get from 'lodash/get.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../utils.js'
import { TagService } from '#connectors/index.js'

declare global {
  // eslint-disable-next-line no-var
  var connections: Connections
}

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
  globalThis.connections = connections
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

const QUERY_TAG = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Tag {
        id
        content
        numMoments
        recommended(input: {}) {
          edges {
            node {
              ... on Tag {
                content
              }
            }
          }
        }
      }
    }
  }
`

const RENAME_TAG = /* GraphQL */ `
  mutation ($input: RenameTagInput!) {
    renameTag(input: $input) {
      id
      content
    }
  }
`

const MERGE_TAG = /* GraphQL */ `
  mutation ($input: MergeTagsInput!) {
    mergeTags(input: $input) {
      ... on Tag {
        id
        content
      }
    }
  }
`

const DELETE_TAG = /* GraphQL */ `
  mutation ($input: DeleteTagsInput!) {
    deleteTags(input: $input)
  }
`

describe('manage tag', () => {
  test('rename and delete tag', async () => {
    const tagService = new TagService(connections)
    const tag = await tagService.upsert({
      content: 'Test tag #1',
      creator: '0',
    })
    const createTagId = toGlobalId({ type: NODE_TYPES.Tag, id: tag?.id })

    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      isMatty: true,
      connections,
    })

    // rename
    const renameContent = 'Rename tag'
    const renameResult = await server.executeOperation({
      query: RENAME_TAG,
      variables: { input: { id: createTagId, content: renameContent } },
    })
    expect(renameResult?.data?.renameTag?.content).toBe(renameContent)

    // merge
    const mergeContent = 'Merge tag'
    const mergeResult = await server.executeOperation({
      query: MERGE_TAG,
      variables: { input: { ids: [createTagId], content: mergeContent } },
    })
    const mergeTagId = mergeResult?.data?.mergeTags?.id
    expect(mergeResult?.data?.mergeTags?.content).toBe(mergeContent)

    // delete
    const deleteResult = await server.executeOperation({
      query: DELETE_TAG,
      variables: { input: { ids: [mergeTagId] } },
    })
    expect(deleteResult?.data?.deleteTags).toBe(true)
  })
})

describe('query tag', () => {
  test('tag recommended', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: QUERY_TAG,
      variables: { input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) } },
    })
    expect(data!.node.recommended.edges).toBeDefined()
  })

  test('tag numMoments', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: QUERY_TAG,
      variables: { input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) } },
    })

    // Verify numMoments field exists and is a number
    expect(data!.node.numMoments).toBeDefined()
    expect(typeof data!.node.numMoments).toBe('number')
    expect(data!.node.numMoments).toBeGreaterThanOrEqual(0)
  })
})

const QUERY_TAG_WRITINGS = /* GraphQL */ `
  query ($input: NodeInput!, $writingsInput: WritingInput!) {
    node(input: $input) {
      ... on Tag {
        id
        content
        writings(input: $writingsInput) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            pinned
            node {
              ... on Article {
                id
                title
                __typename
              }
              ... on Moment {
                id
                content
                __typename
              }
            }
          }
        }
      }
    }
  }
`

describe('query tag writings', () => {
  test('tag writings returns articles and moments', async () => {
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: QUERY_TAG_WRITINGS,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) },
        writingsInput: { first: 10 },
      },
    })

    expect(errors).toBeUndefined()

    // Verify writings field exists and has correct structure
    expect(data.node.writings).toBeDefined()
    expect(data.node.writings.totalCount).toBeDefined()
    expect(data.node.writings.pageInfo).toBeDefined()
    expect(data.node.writings.edges).toBeDefined()

    // Verify each edge has correct structure
    data.node.writings.edges.forEach((edge: any) => {
      expect(edge.cursor).toBeDefined()
      expect(edge.pinned).toBeDefined()
      expect(edge.node).toBeDefined()
      expect(edge.node.id).toBeDefined()
      expect(['Article', 'Moment']).toContain(edge.node.__typename)
    })
  })

  test('tag writings with pagination', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: QUERY_TAG_WRITINGS,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) },
        writingsInput: { first: 5 },
      },
    })

    // Verify pagination works
    expect(data.node.writings.edges.length).toBeLessThanOrEqual(5)

    if (data.node.writings.edges.length > 0) {
      const firstEdge = data.node.writings.edges[0]
      expect(firstEdge.cursor).toBeDefined()
    }
  })
})
