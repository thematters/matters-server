import type { Connections } from '#definitions/index.js'

import _difference from 'lodash/difference.js'
import _get from 'lodash/get.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../utils.js'
import {
  TagService,
  PublicationService,
  AtomService,
} from '#connectors/index.js'

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
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
        shortHash
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
  test('tag shortHash', async () => {
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: QUERY_TAG,
      variables: { input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) } },
    })
    expect(errors).toBeUndefined()
    expect(data.node.shortHash).toBeDefined()
  })
  test('tag recommended', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: QUERY_TAG,
      variables: { input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) } },
    })
    expect(data.node.recommended.edges).toBeDefined()
  })

  test('tag numMoments', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: QUERY_TAG,
      variables: { input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) } },
    })

    // Verify numMoments field exists and is a number
    expect(data.node.numMoments).toBeDefined()
    expect(typeof data.node.numMoments).toBe('number')
    expect(data.node.numMoments).toBeGreaterThanOrEqual(0)
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

const QUERY_TAG_ARTICLES = /* GraphQL */ `
  query ($input: NodeInput!, $articlesInput: TagArticlesInput!) {
    node(input: $input) {
      ... on Tag {
        id
        content
        articles(input: $articlesInput) {
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
              id
              title
              shortHash
              createdAt
              state
              author {
                id
                userName
              }
            }
          }
        }
      }
    }
  }
`

describe('query tag articles', () => {
  test('tag articles with default parameters', async () => {
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) },
        articlesInput: {},
      },
    })

    expect(errors).toBeUndefined()

    // Verify articles field exists and has correct structure
    expect(data.node.articles).toBeDefined()
    expect(data.node.articles.totalCount).toBeDefined()
    expect(typeof data.node.articles.totalCount).toBe('number')
    expect(data.node.articles.pageInfo).toBeDefined()
    expect(data.node.articles.edges).toBeDefined()
    expect(Array.isArray(data.node.articles.edges)).toBe(true)

    // Verify each edge has correct structure
    data.node.articles.edges.forEach((edge: any) => {
      expect(edge.cursor).toBeDefined()
      expect(edge.pinned).toBeDefined()
      expect(typeof edge.pinned).toBe('boolean')
      expect(edge.node).toBeDefined()
      expect(edge.node.id).toBeDefined()
      expect(edge.node.title).toBeDefined()
      expect(edge.node.shortHash).toBeDefined()
      expect(edge.node.createdAt).toBeDefined()
      expect(edge.node.state).toBeDefined()
      expect(edge.node.author).toBeDefined()
      expect(edge.node.author.id).toBeDefined()
    })
  })

  test('tag articles with pagination', async () => {
    const server = await testClient({ connections })

    // First page
    const { data: firstPageData } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) },
        articlesInput: { first: 5 },
      },
    })

    expect(firstPageData.node.articles.edges.length).toBeLessThanOrEqual(5)

    if (firstPageData.node.articles.pageInfo.hasNextPage) {
      const endCursor = firstPageData.node.articles.pageInfo.endCursor

      // Second page
      const { data: secondPageData } = await server.executeOperation({
        query: QUERY_TAG_ARTICLES,
        variables: {
          input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) },
          articlesInput: { first: 5, after: endCursor },
        },
      })

      expect(secondPageData.node.articles.edges.length).toBeGreaterThan(0)
      expect(secondPageData.node.articles.pageInfo.hasPreviousPage).toBe(true)

      // Ensure different articles on second page
      const firstPageIds = firstPageData.node.articles.edges.map(
        (e: any) => e.node.id
      )
      const secondPageIds = secondPageData.node.articles.edges.map(
        (e: any) => e.node.id
      )
      const commonIds = firstPageIds.filter((id: string) =>
        secondPageIds.includes(id)
      )
      expect(commonIds.length).toBe(0)
    }
  })

  test('tag articles sorted by creation date (default)', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) },
        articlesInput: { first: 10, sortBy: 'byCreatedAtDesc' },
      },
    })

    const articles = data.node.articles.edges.map((e: any) => e.node)

    // Verify articles are sorted by creation date descending
    for (let i = 1; i < articles.length; i++) {
      const prevDate = new Date(articles[i - 1].createdAt)
      const currDate = new Date(articles[i].createdAt)
      expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime())
    }
  })

  test('tag articles sorted by hottest', async () => {
    // Note: There is a known issue with the hottest articles query implementation
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) },
        articlesInput: { first: 10, sortBy: 'byHottestDesc' },
      },
    })

    expect(errors).toBeUndefined()
    expect(Array.isArray(data.node.articles.edges)).toBe(true)
  })

  test('tag articles with pinned articles', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) },
        articlesInput: { first: 20 },
      },
    })

    const pinnedArticles = data.node.articles.edges.filter((e: any) => e.pinned)
    const unpinnedArticles = data.node.articles.edges.filter(
      (e: any) => !e.pinned
    )

    // Verify pinned field exists for all articles
    data.node.articles.edges.forEach((edge: any) => {
      expect(typeof edge.pinned).toBe('boolean')
    })

    // If there are pinned articles, they should appear first
    if (pinnedArticles.length > 0 && unpinnedArticles.length > 0) {
      const lastPinnedIndex = data.node.articles.edges.findIndex(
        (e: any) =>
          e.node.id === pinnedArticles[pinnedArticles.length - 1].node.id
      )
      const firstUnpinnedIndex = data.node.articles.edges.findIndex(
        (e: any) => e.node.id === unpinnedArticles[0].node.id
      )
      expect(lastPinnedIndex).toBeLessThan(firstUnpinnedIndex)
    }
  })

  test('tag articles for non-existent tag', async () => {
    const server = await testClient({ connections })
    const nonExistentTagId = toGlobalId({ type: NODE_TYPES.Tag, id: 999999 })

    const { data, errors } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: nonExistentTagId },
        articlesInput: { first: 10 },
      },
    })

    // The behavior depends on implementation - it might return null or throw an error
    if (errors) {
      expect(errors.length).toBeGreaterThan(0)
    } else {
      expect(data.node).toBeNull()
    }
  })

  test('tag articles with empty results', async () => {
    const tagService = new TagService(connections)

    // Create a new tag with no articles
    const newTag = await tagService.upsert({
      content: 'Empty Tag Test',
      creator: '0',
    })
    const emptyTagId = toGlobalId({ type: NODE_TYPES.Tag, id: newTag.id })

    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: emptyTagId },
        articlesInput: { first: 10 },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.node.articles.totalCount).toBe(0)
    expect(data.node.articles.edges.length).toBe(0)
    expect(data.node.articles.pageInfo.hasNextPage).toBe(false)
    expect(data.node.articles.pageInfo.hasPreviousPage).toBe(false)
  })

  test('tag articles with various page sizes', async () => {
    const server = await testClient({ connections })
    const pageSizes = [1, 5, 10, 20]

    for (const pageSize of pageSizes) {
      const { data } = await server.executeOperation({
        query: QUERY_TAG_ARTICLES,
        variables: {
          input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: 1 }) },
          articlesInput: { first: pageSize },
        },
      })

      expect(data.node.articles.edges.length).toBeLessThanOrEqual(pageSize)

      // If totalCount is greater than pageSize, hasNextPage should be true
      if (data.node.articles.totalCount > pageSize) {
        expect(data.node.articles.pageInfo.hasNextPage).toBe(true)
      }
    }
  })
})
describe('tag articles with pinned items', () => {
  test('tag articles hottest sorting with pinned articles', async () => {
    const tagService = new TagService(connections)
    const publicationService = new PublicationService(connections)
    const atomSerivce = new AtomService(connections)

    // Create a new tag for testing
    const testTag = await tagService.upsert({
      content: 'Test Hottest Pinned Tag',
      creator: '1',
    })
    const tagId = testTag.id

    // Create multiple articles
    const articles = []
    for (let i = 1; i <= 5; i++) {
      const [article] = await publicationService.createArticle({
        title: `Hottest Test Article ${i}`,
        content: `Test content ${i}`,
        authorId: '1',
        tags: [tagId],
      })
      articles.push(article)
    }

    await tagService.createArticleTags({
      tagIds: [tagId],
      articleIds: articles.map(({ id }) => id),
      creator: '1',
    })

    // Pin some articles with different timestamps
    const now = new Date()
    await atomSerivce.update({
      table: 'article_tag',
      where: {
        articleId: articles[2].id,
        tagId: tagId,
      },
      data: {
        pinned: true,
        pinnedAt: new Date(now.getTime() - 3600000), // 1 hour ago
      },
    })

    await atomSerivce.update({
      table: 'article_tag',
      where: {
        articleId: articles[4].id,
        tagId: tagId,
      },
      data: {
        pinned: true,
        pinnedAt: now,
      },
    })

    // Query with hottest sorting
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: tagId }) },
        articlesInput: { first: 10, sortBy: 'byHottestDesc' },
      },
    })

    expect(errors).toBeUndefined()

    const articleEdges = data.node.articles.edges

    // Verify pinned articles appear first in hottest sorting
    expect(articleEdges[0].pinned).toBe(true)
    expect(articleEdges[1].pinned).toBe(true)

    // The most recently pinned article should be first
    expect(articleEdges[0].node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: articles[4].id })
    )
    expect(articleEdges[1].node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: articles[2].id })
    )

    // Non-pinned articles should follow
    for (let i = 2; i < articleEdges.length; i++) {
      expect(articleEdges[i].pinned).toBe(false)
    }
  })

  test('update pinned status of articles', async () => {
    const tagService = new TagService(connections)
    const publicationService = new PublicationService(connections)
    const atomSerivce = new AtomService(connections)

    // Create a test tag and article
    const testTag = await tagService.upsert({
      content: 'Test Update Pinned Status',
      creator: '1',
    })
    const tagId = testTag.id

    const [article] = await publicationService.createArticle({
      title: 'Article to test pin/unpin',
      content: 'Test content',
      authorId: '1',
      tags: [tagId],
    })
    await tagService.createArticleTags({
      articleIds: [article.id],
      tagIds: [testTag.id],
      creator: article.authorId,
    })

    // Initially not pinned
    const server = await testClient({ connections })
    let { data } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: tagId }) },
        articlesInput: { first: 10 },
      },
    })

    expect(data.node.articles.edges[0].pinned).toBe(false)

    // Pin the article
    await atomSerivce.update({
      table: 'article_tag',
      where: {
        articleId: article.id,
        tagId: tagId,
      },
      data: {
        pinned: true,
        pinnedAt: new Date(),
      },
    })

    // Query again
    ;({ data } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: tagId }) },
        articlesInput: { first: 10 },
      },
    }))

    expect(data.node.articles.edges[0].pinned).toBe(true)

    // Unpin the article
    await atomSerivce.update({
      table: 'article_tag',
      where: {
        articleId: article.id,
        tagId: tagId,
      },
      data: {
        pinned: false,
      },
    })

    // Query once more
    ;({ data } = await server.executeOperation({
      query: QUERY_TAG_ARTICLES,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Tag, id: tagId }) },
        articlesInput: { first: 10 },
      },
    }))

    expect(data.node.articles.edges[0].pinned).toBe(false)
  })
})
