import type { Connections } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { CollectionService, ArticleService } from 'connectors'

import { testClient, genConnections, closeConnections } from '../utils'

let connections: Connections
let collectionService: CollectionService
let articleService: ArticleService

beforeAll(async () => {
  connections = await genConnections()
  collectionService = new CollectionService(connections)
  articleService = new ArticleService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const articleGlobalId1 = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
const articleGlobalId4 = toGlobalId({ type: NODE_TYPES.Article, id: 4 })

const GET_VIEWER_COLLECTIONS = /* GraphQL */ `
  query {
    viewer {
      id
      collections(input: { first: null }) {
        totalCount
        edges {
          node {
            id
            title
            description
            cover
          }
        }
      }
    }
  }
`
const PUT_COLLECTION = /* GraphQL */ `
  mutation ($input: PutCollectionInput!) {
    putCollection(input: $input) {
      id
      title
      description
      cover
      pinned
    }
  }
`
const ADD_COLLECTIONS_ARTICLES = /* GraphQL */ `
  mutation ($input: AddCollectionsArticlesInput!) {
    addCollectionsArticles(input: $input) {
      id
      title
      articles(input: { first: null }) {
        totalCount
        edges {
          node {
            id
          }
        }
      }
    }
  }
`
const DEL_COLLECTION_ARTICLES = /* GraphQL */ `
  mutation ($input: DeleteCollectionArticlesInput!) {
    deleteCollectionArticles(input: $input) {
      id
      title
      articles(input: { first: null }) {
        totalCount
        edges {
          node {
            id
          }
        }
      }
    }
  }
`
describe('get viewer collections', () => {
  const GET_COLLECTION = /* GraphQL */ `
    query ($input: NodeInput!) {
      node(input: $input) {
        ... on Collection {
          id
          title
          author {
            id
          }
          description
          cover
        }
      }
    }
  `
  test('not logged-in user', async () => {
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: GET_VIEWER_COLLECTIONS,
    })
    expect(data?.viewer?.collections?.totalCount).toBe(0)
    expect(errors).toBeUndefined()
  })

  test('logged-in user', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_COLLECTIONS,
    })
    expect(data?.viewer?.collections?.totalCount).toBe(0)

    // create a collection
    const title = 'test title'
    await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title } },
    })

    const { data: data1 } = await server.executeOperation({
      query: GET_VIEWER_COLLECTIONS,
    })
    expect(data1?.viewer?.collections?.totalCount).toBe(1)
    expect(data1?.viewer?.collections?.edges[0]?.node?.title).toBe(title)
    expect(data1?.viewer?.collections?.edges[0]?.node?.description).toBe(null)
    expect(data1?.viewer?.collections?.edges[0]?.node?.cover).toBe(null)

    // get collection from `node` query works
    const { data: data2 } = await server.executeOperation({
      query: GET_COLLECTION,
      variables: {
        input: { id: data1?.viewer?.collections?.edges[0]?.node?.id },
      },
    })
    expect(data2?.node?.title).toBe(title)
    expect(data2?.node?.author?.id).toBe(data1?.viewer?.id)
  })
})

describe('collections CURD', () => {
  test('not logged-in users can not mutate collections', async () => {
    const server = await testClient({ connections })
    const { errors } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test' } },
    })
    expect(errors?.[0]?.message).toBe(
      '"visitor" isn\'t authorized for "putCollection"'
    )
  })
  test('users w/o username can not mutate collections', async () => {
    const server = await testClient({ noUserName: true, connections })
    const { errors } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test' } },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
  test('long title/description is not allowed', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { errors } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'a'.repeat(41) } },
    })
    expect(errors?.[0]?.message).toBe('Title too long')

    const { errors: errors2 } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test', description: 'a'.repeat(201) } },
    })
    expect(errors2?.[0]?.message).toBe('Description too long')
  })
  describe('cover is checked', () => {
    test('invalid cover input', async () => {
      const server = await testClient({ isAuth: true, connections })
      const { errors } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: { input: { title: 'test', cover: 'invalid cover' } },
      })
      expect(errors?.[0]?.message).toBe('Asset does not exists')
    })

    test('assset not exists in db', async () => {
      const server = await testClient({ isAuth: true, connections })
      const { errors } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: {
          input: {
            title: 'test',
            cover: '11000000-0000-0000-0000-000000000001',
          },
        },
      })
      expect(errors?.[0]?.message).toBe('Asset does not exists')
    })

    test('asset not cover type', async () => {
      const server = await testClient({ isAuth: true, connections })
      const { errors } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: {
          input: {
            title: 'test',
            cover: '00000000-0000-0000-0000-000000000001',
          },
        },
      })
      expect(errors?.[0]?.message).toBe('Asset does not exists')
    })

    test('success', async () => {
      const server = await testClient({ isAuth: true, connections })
      const { data } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: {
          input: {
            title: 'test',
            cover: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          },
        },
      })
      expect(data?.putCollection?.cover).toMatch(/.jpg/)
    })
  })
  describe('update collection', () => {
    test('id is checked', async () => {
      const server = await testClient({ isAuth: true, connections })
      const { errors } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: { input: { id: 'invalid id', title: 'test' } },
      })
      expect(errors?.[0]?.message).toBe('invalid globalId')

      const { errors: errors2 } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: {
          input: {
            id: toGlobalId({ type: NODE_TYPES.Circle, id: '1' }),
            title: 'test',
          },
        },
      })
      expect(errors2?.[0]?.message).toBe('Invalid Collection id')

      const { errors: errors3 } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: {
          input: {
            id: toGlobalId({ type: NODE_TYPES.Collection, id: '999' }),
            title: 'test',
          },
        },
      })
      expect(errors3?.[0]?.message).toBe('Collection not found')

      // can not update others users' collections
      const server2 = await testClient({
        isAuth: true,
        isMatty: true,
        connections,
      })
      const {
        data: {
          putCollection: { id },
        },
      } = await server2.executeOperation({
        query: PUT_COLLECTION,
        variables: { input: { title: 'test' } },
      })
      const { errors: errors4 } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: { input: { title: 'new title', id } },
      })
      expect(errors4?.[0]?.message).toBe('Viewer has no permission')
    })
    test('success', async () => {
      const server = await testClient({ isAuth: true, connections })
      const {
        data: {
          putCollection: { id },
        },
      } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: { input: { title: 'test' } },
      })

      const newTitle = 'new title'

      const { data } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: { input: { title: newTitle, id } },
      })
      expect(data.putCollection.title).toBe(newTitle)
    })
  })
})

describe('delete collections', () => {
  const DEL_COLLECTIONS = /* GraphQL */ `
    mutation ($input: DeleteCollectionsInput!) {
      deleteCollections(input: $input)
    }
  `
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any
  let id: string
  let othersId: string
  beforeAll(async () => {
    server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test' } },
    })
    id = data?.putCollection?.id
    const othersServer = await testClient({
      isAuth: true,
      isMatty: true,
      connections,
    })
    const { data: data2 } = await othersServer.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test' } },
    })
    othersId = data2?.putCollection?.id
  })
  test('not logged-in users can not mutate collections', async () => {
    const server2 = await testClient({ connections })
    const { errors } = await server2.executeOperation({
      query: DEL_COLLECTIONS,
      variables: { input: { ids: [id] } },
    })
    expect(errors?.[0]?.message).toBe(
      '"visitor" isn\'t authorized for "deleteCollections"'
    )
  })
  test('ids is checked', async () => {
    const { errors } = await server.executeOperation({
      query: DEL_COLLECTIONS,
      variables: {
        input: { ids: [toGlobalId({ type: NODE_TYPES.Circle, id: '1' })] },
      },
    })
    expect(errors?.[0]?.message).toBe('Invalid collection ids')
  })
  test('can not delete others users collections', async () => {
    const { errors } = await server.executeOperation({
      query: DEL_COLLECTIONS,
      variables: { input: { ids: [othersId] } },
    })
    expect(errors?.[0]?.message).toBe('Author id not match')
  })
  test('success', async () => {
    const { data } = await server.executeOperation({
      query: DEL_COLLECTIONS,
      variables: { input: { ids: [] } },
    })
    expect(data?.deleteCollections).toBe(false)

    const { data: data1 } = await server.executeOperation({
      query: DEL_COLLECTIONS,
      variables: { input: { ids: [id] } },
    })
    expect(data1?.deleteCollections).toBe(true)

    const { errors } = await server.executeOperation({
      query: DEL_COLLECTIONS,
      variables: { input: { ids: [id] } },
    })
    expect(errors?.[0]?.message).toBe('Collection not found')
  })
})

describe('add articles to collections', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any
  let collectionId1: string
  let collectionId2: string
  beforeAll(async () => {
    server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'collection 1' } },
    })
    collectionId1 = data?.putCollection?.id
    const { data: data2 } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'collection 2' } },
    })
    collectionId2 = data2?.putCollection?.id
  })
  test('not logged-in users can not mutate collections', async () => {
    const visitorServer = await testClient({ connections })
    const { errors } = await visitorServer.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId1],
          articles: [articleGlobalId1],
        },
      },
    })
    expect(errors?.[0]?.message).toBe(
      '"visitor" isn\'t authorized for "addCollectionsArticles"'
    )
  })
  test('collections is checked', async () => {
    const { errors } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [toGlobalId({ type: NODE_TYPES.Circle, id: '1' })],
          articles: [articleGlobalId1],
        },
      },
    })
    expect(errors?.[0]?.message).toBe('Invalid Collection ids')
  })
  test('articles is checked', async () => {
    const { errors } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId1],
          articles: [toGlobalId({ type: NODE_TYPES.Circle, id: '1' })],
        },
      },
    })
    expect(errors?.[0]?.message).toBe('Invalid Article ids')
  })
  test('action limit', async () => {
    const { errors } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: Array(201).fill(collectionId1),
          articles: [articleGlobalId1],
        },
      },
    })
    expect(errors?.[0]?.message).toBe('Action limit exceeded')
  })
  test('can not add others articles', async () => {
    const { errors } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId1],
          articles: [toGlobalId({ type: NODE_TYPES.Article, id: '2' })],
        },
      },
    })
    expect(errors?.[0]?.message).toBe('Viewer has no permission')
  })
  test('can not add to others collections', async () => {
    // get others collection
    const server2 = await testClient({
      isAuth: true,
      isMatty: true,
      connections,
    })
    const {
      data: {
        putCollection: { id: othersCollectionId },
      },
    } = await server2.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test' } },
    })

    const { errors } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [othersCollectionId],
          articles: [articleGlobalId1],
        },
      },
    })
    expect(errors?.[0]?.message).toBe('Viewer has no permission')
  })
  test('collections can be empty', async () => {
    const { data } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [],
          articles: [articleGlobalId1],
        },
      },
    })
    expect(data?.addCollectionsArticles).toEqual([])
  })
  test('articles can be empty', async () => {
    const { errors, data } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId1, collectionId2],
          articles: [],
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data?.addCollectionsArticles[0].id).toBe(collectionId1)
    expect(data?.addCollectionsArticles[1].id).toBe(collectionId2)
    expect(data?.addCollectionsArticles[0].articles.totalCount).toBe(0)
  })
  test('success', async () => {
    const { data } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId1],
          articles: [articleGlobalId1],
        },
      },
    })
    expect(data?.addCollectionsArticles[0].articles.totalCount).toBe(1)
    expect(data?.addCollectionsArticles[0].articles.edges[0].node.id).toBe(
      articleGlobalId1
    )

    const { errors: errors2, data: data2 } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId1],
          articles: [articleGlobalId4],
        },
      },
    })
    expect(errors2).toBeUndefined()
    expect(data2?.addCollectionsArticles[0].articles.totalCount).toBe(2)
    expect(data2?.addCollectionsArticles[0].articles.edges[0].node.id).toBe(
      articleGlobalId4
    )
  })
})

describe('delete articles in collections', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any
  let collectionId: string
  let othersCollectionId: string
  beforeAll(async () => {
    server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'my collection' } },
    })
    collectionId = data?.putCollection?.id
    const othersServer = await testClient({
      isAuth: true,
      isMatty: true,
      connections,
    })
    const { data: data2 } = await othersServer.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'others collection' } },
    })
    othersCollectionId = data2?.putCollection?.id
  })
  test('not logged-in users can not mutate collections', async () => {
    const visitorServer = await testClient({ connections })
    const { errors } = await visitorServer.executeOperation({
      query: DEL_COLLECTION_ARTICLES,
      variables: {
        input: {
          collection: collectionId,
          articles: [articleGlobalId1],
        },
      },
    })
    expect(errors?.[0]?.message).toBe(
      '"visitor" isn\'t authorized for "deleteCollectionArticles"'
    )
  })
  test('collections is checked', async () => {
    const { errors } = await server.executeOperation({
      query: DEL_COLLECTION_ARTICLES,
      variables: {
        input: {
          collection: toGlobalId({ type: NODE_TYPES.Circle, id: '1' }),
          articles: [articleGlobalId1],
        },
      },
    })
    expect(errors?.[0]?.message).toBe('Invalid Collection id')
    const { errors: errors2 } = await server.executeOperation({
      query: DEL_COLLECTION_ARTICLES,
      variables: {
        input: {
          collection: othersCollectionId,
          articles: [articleGlobalId1],
        },
      },
    })
    expect(errors2?.[0]?.message).toBe('Viewer has no permission')
  })
  test('success', async () => {
    const { data } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId],
          articles: [articleGlobalId1, articleGlobalId4],
        },
      },
    })
    expect(data?.addCollectionsArticles[0].articles.totalCount).toBe(2)

    const { data: delData } = await server.executeOperation({
      query: DEL_COLLECTION_ARTICLES,
      variables: {
        input: {
          collection: collectionId,
          articles: [articleGlobalId1],
        },
      },
    })
    expect(delData?.deleteCollectionArticles.articles.totalCount).toBe(1)
    expect(delData?.deleteCollectionArticles.articles.edges[0].node.id).toBe(
      articleGlobalId4
    )
  })
})

describe('reorder articles in collections', () => {
  const REORDER_COLLECTION_ARTICLES = /* GraphQL */ `
    mutation ($input: ReorderCollectionArticlesInput!) {
      reorderCollectionArticles(input: $input) {
        id
        title
        articles(input: { first: null }) {
          totalCount
          edges {
            node {
              id
            }
          }
        }
      }
    }
  `
  let server: any
  let collectionGlobalId: string
  beforeAll(async () => {
    server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'my collection' } },
    })
    collectionGlobalId = data?.putCollection?.id
    await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionGlobalId],
          articles: [articleGlobalId1, articleGlobalId4],
        },
      },
    })
  })
  test('success', async () => {
    const { errors, data } = await server.executeOperation({
      query: REORDER_COLLECTION_ARTICLES,
      variables: {
        input: {
          collection: collectionGlobalId,
          moves: { item: articleGlobalId1, newPosition: 0 },
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data?.reorderCollectionArticles.articles.edges[0].node.id).toBe(
      articleGlobalId1
    )
  })
})

describe('get collection articles', () => {
  const GET_COLLECTION_ARTICLES = /* GraphQL */ `
    query (
      $collectionInput: NodeInput!
      $articleInput: CollectionArticlesInput!
    ) {
      node(input: $collectionInput) {
        ... on Collection {
          articles(input: $articleInput) {
            totalCount
            pageInfo {
              startCursor
              endCursor
              hasPreviousPage
              hasNextPage
            }
            edges {
              cursor
              node {
                id
              }
            }
          }
        }
      }
    }
  `
  const authorId = '1'
  const title = 'test pagination'
  let server: any
  let articleIds: string[]
  let articleGlobalIds: string[]
  beforeAll(async () => {
    server = await testClient({ connections })
    const articles = await articleService.findByAuthor(authorId)
    expect(articles.length).toBeGreaterThanOrEqual(3)
    articleIds = articles.map(({ id }) => id).sort()
    articleGlobalIds = articleIds.map((id) =>
      toGlobalId({ type: NODE_TYPES.Article, id })
    )
  })
  test('no articles', async () => {
    const collection = await collectionService.createCollection({
      title,
      authorId,
    })
    const collectionGlobalId = toGlobalId({
      type: NODE_TYPES.Collection,
      id: collection.id,
    })
    const { errors, data } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLES,
      variables: {
        collectionInput: { id: collectionGlobalId },
        articleInput: { first: 10 },
      },
    })
    expect(errors).toBeUndefined()
    expect(data?.node.articles.totalCount).toBe(0)
    expect(data?.node.articles.edges.length).toBe(0)
  })
  test('one article', async () => {
    const collection = await collectionService.createCollection({
      title,
      authorId,
    })
    await collectionService.addArticles(collection.id, articleIds.slice(0, 1))
    const collectionGlobalId = toGlobalId({
      type: NODE_TYPES.Collection,
      id: collection.id,
    })

    const { errors, data } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLES,
      variables: {
        collectionInput: { id: collectionGlobalId },
        articleInput: { first: 10 },
      },
    })
    expect(errors).toBeUndefined()
    expect(data?.node.articles.totalCount).toBe(1)
    expect(data?.node.articles.edges.length).toBe(1)
    expect(data?.node.articles.edges[0].node.id).toBe(articleGlobalIds[0])
    expect(data?.node.articles.pageInfo.hasPreviousPage).toBe(false)
    expect(data?.node.articles.pageInfo.hasNextPage).toBe(false)
  })
  test('multiple articles', async () => {
    const collection = await collectionService.createCollection({
      title,
      authorId,
    })
    await collectionService.addArticles(collection.id, articleIds.slice(0, 3))
    const collectionGlobalId = toGlobalId({
      type: NODE_TYPES.Collection,
      id: collection.id,
    })

    // forward pagination
    const { errors: errors1, data: data1 } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLES,
      variables: {
        collectionInput: { id: collectionGlobalId },
        articleInput: { first: 2, reversed: false },
      },
    })
    expect(errors1).toBeUndefined()
    expect(data1?.node.articles.totalCount).toBe(3)
    expect(data1?.node.articles.edges.length).toBe(2)
    expect(data1?.node.articles.pageInfo.hasPreviousPage).toBe(false)
    expect(data1?.node.articles.pageInfo.hasNextPage).toBe(true)
    expect(data1?.node.articles.edges[0].node.id).toBe(articleGlobalIds[0])
    expect(data1?.node.articles.edges[1].node.id).toBe(articleGlobalIds[1])

    const { errors: errors2, data: data2 } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLES,
      variables: {
        collectionInput: { id: collectionGlobalId },
        articleInput: {
          first: 2,
          after: data1?.node.articles.pageInfo.endCursor,
          reversed: false,
        },
      },
    })

    expect(errors2).toBeUndefined()
    expect(data2?.node.articles.totalCount).toBe(3)
    expect(data2?.node.articles.edges.length).toBe(1)
    expect(data2?.node.articles.pageInfo.hasPreviousPage).toBe(true)
    expect(data2?.node.articles.pageInfo.hasNextPage).toBe(false)
    expect(data2?.node.articles.edges[0].node.id).toBe(articleGlobalIds[2])

    // backward pagination
    const { errors: errors3, data: data3 } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLES,
      variables: {
        collectionInput: { id: collectionGlobalId },
        articleInput: {
          last: 1,
          // 6
          before: data2?.node.articles.pageInfo.endCursor,
          reversed: false,
        },
      },
    })
    expect(errors3).toBeUndefined()
    expect(data3?.node.articles.totalCount).toBe(3)
    expect(data3?.node.articles.edges.length).toBe(1)
    expect(data3?.node.articles.pageInfo.hasPreviousPage).toBe(true)
    expect(data3?.node.articles.pageInfo.hasNextPage).toBe(true)
    expect(data3?.node.articles.edges[0].node.id).toBe(articleGlobalIds[1])

    const { errors: errors4, data: data4 } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLES,
      variables: {
        collectionInput: { id: collectionGlobalId },
        articleInput: {
          last: 1,
          before: data3?.node.articles.pageInfo.startCursor,
          reversed: false,
        },
      },
    })
    expect(errors4).toBeUndefined()
    expect(data4?.node.articles.totalCount).toBe(3)
    expect(data4?.node.articles.edges.length).toBe(1)
    expect(data4?.node.articles.pageInfo.hasPreviousPage).toBe(false)
    expect(data4?.node.articles.pageInfo.hasNextPage).toBe(true)
    expect(data4?.node.articles.edges[0].node.id).toBe(articleGlobalIds[0])

    // reversed by default
    const { errors: errors5, data: data5 } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLES,
      variables: {
        collectionInput: { id: collectionGlobalId },
        articleInput: { first: 2 },
      },
    })
    expect(errors5).toBeUndefined()
    expect(data5?.node.articles.totalCount).toBe(3)
    expect(data5?.node.articles.edges.length).toBe(2)
    expect(data5?.node.articles.pageInfo.hasPreviousPage).toBe(false)
    expect(data5?.node.articles.pageInfo.hasNextPage).toBe(true)
    expect(data5?.node.articles.edges[0].node.id).toBe(articleGlobalIds[2])
    expect(data5?.node.articles.edges[1].node.id).toBe(articleGlobalIds[1])

    // includeAfter
    const { errors: errors6, data: data6 } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLES,
      variables: {
        collectionInput: { id: collectionGlobalId },
        articleInput: {
          first: 2,
          after: data5?.node.articles.pageInfo.endCursor,
          includeAfter: true,
        },
      },
    })
    expect(errors6).toBeUndefined()
    expect(data6?.node.articles.totalCount).toBe(3)
    expect(data6?.node.articles.edges.length).toBe(2)
    expect(data6?.node.articles.pageInfo.hasPreviousPage).toBe(true)
    expect(data6?.node.articles.pageInfo.hasNextPage).toBe(false)
    expect(data6?.node.articles.edges[0].node.id).toBe(articleGlobalIds[1])
    expect(data6?.node.articles.edges[1].node.id).toBe(articleGlobalIds[0])

    // return total count if first is 0
    const { errors: errors0, data: data0 } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLES,
      variables: {
        collectionInput: { id: collectionGlobalId },
        articleInput: {
          first: 0,
        },
      },
    })

    expect(errors0).toBeUndefined()
    expect(data0?.node.articles.totalCount).toBe(3)
  })
})

describe('update pinned', () => {
  const GET_PINNED_WORKS = /* GraphQL */ `
    query {
      viewer {
        pinnedWorks {
          id
          title
        }
      }
    }
  `

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any
  let collectionId: string
  const title = 'my collection'
  beforeAll(async () => {
    server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title } },
    })
    collectionId = data?.putCollection?.id
    await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId],
          articles: [articleGlobalId1, articleGlobalId4],
        },
      },
    })
  })
  test('pin collection success', async () => {
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: {
        input: {
          id: collectionId,
          pinned: true,
        },
      },
    })
    expect(data?.putCollection?.pinned).toBe(true)

    const { data: data2 } = await server.executeOperation({
      query: GET_PINNED_WORKS,
    })
    expect(data2?.viewer.pinnedWorks.length).toEqual(1)
  })

  test('pinned work order by pinnedAt asc', async () => {
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title } },
    })
    const collectionId2 = data?.putCollection?.id
    const { data: data2 } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: {
        input: {
          id: collectionId2,
          pinned: true,
        },
      },
    })
    expect(data2?.putCollection?.pinned).toBe(true)

    const { data: data3 } = await server.executeOperation({
      query: GET_PINNED_WORKS,
    })
    expect(data3?.viewer.pinnedWorks.length).toEqual(2)
    expect(data3?.viewer.pinnedWorks.length).toEqual(2)
    expect(data3?.viewer.pinnedWorks[0].id).toEqual(collectionId)
  })
})

describe('check article if in collections', () => {
  const GET_COLLECTION_ARTICLE_CONTAINS = /* GraphQL */ `
    query ($input: NodeInput!) {
      viewer {
        collections(input: { first: null }) {
          edges {
            node {
              id
              contains(input: $input)
            }
          }
        }
      }
    }
  `

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any
  let collectionId: string
  beforeAll(async () => {
    server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test' } },
    })
    collectionId = data?.putCollection?.id
    const { data: data2 } = await server.executeOperation({
      query: GET_VIEWER_COLLECTIONS,
    })
    // make sure test collection index 0
    expect(data2?.viewer?.collections?.edges[0].node.id).toBe(collectionId)
  })
  test('empty collections return false', async () => {
    const { data } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLE_CONTAINS,
      variables: {
        input: { id: articleGlobalId1 },
      },
    })
    expect(data?.viewer?.collections?.edges[0].node.contains).toBe(false)
  })
  test('article in collections return true', async () => {
    await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId],
          articles: [articleGlobalId1],
        },
      },
    })
    const { data } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLE_CONTAINS,
      variables: {
        input: { id: articleGlobalId1 },
      },
    })
    expect(data?.viewer?.collections?.edges[0].node.contains).toBe(true)

    const { data: data2 } = await server.executeOperation({
      query: GET_COLLECTION_ARTICLE_CONTAINS,
      variables: {
        input: { id: articleGlobalId4 },
      },
    })
    expect(data2?.viewer?.collections?.edges[0].node.contains).toBe(false)
  })
})

test('get latest works', async () => {
  const GET_LATEST_WORKS = /* GraphQL */ `
    query {
      viewer {
        latestWorks {
          id
          title
          ... on Article {
            revisedAt
          }
          ... on Collection {
            updatedAt
          }
        }
      }
    }
  `

  const server = await testClient({ isAuth: true, connections })
  const { data } = await server.executeOperation({
    query: GET_LATEST_WORKS,
  })
  expect(data?.viewer?.latestWorks.length).toBeLessThan(5)
  if (data?.viewer?.latestWorks.length >= 2) {
    expect(data?.viewer?.latestWorks[0].updatedAt.getTime()).toBeGreaterThan(
      data?.viewer?.latestWorks[1].updatedAt.getTime()
    )
  }
})

describe('like/unlike collection', () => {
  const LIKE_COLLECTION = /* GraphQL */ `
    mutation ($input: LikeCollectionInput!) {
      likeCollection(input: $input) {
        id
        liked
      }
    }
  `
  const UNLIKE_COLLECTION = /* GraphQL */ `
    mutation ($input: UnlikeCollectionInput!) {
      unlikeCollection(input: $input) {
        id
        liked
      }
    }
  `
  test('success', async () => {
    const collection = await collectionService.createCollection({
      authorId: '2',
      title: 'test',
      description: 'test',
    })
    const server = await testClient({ isAuth: true, connections })
    const id = toGlobalId({ type: NODE_TYPES.Collection, id: collection.id })

    const { errors: errorsLike, data: dataLike } =
      await server.executeOperation({
        query: LIKE_COLLECTION,
        variables: { input: { id } },
      })
    expect(errorsLike).toBeUndefined()
    expect(dataLike.likeCollection.liked).toBeTruthy()

    const { errors: errorsUnlike, data: dataUnlike } =
      await server.executeOperation({
        query: UNLIKE_COLLECTION,
        variables: { input: { id } },
      })
    expect(errorsUnlike).toBeUndefined()
    expect(dataUnlike.unlikeCollection.liked).toBeFalsy()
  })
})
