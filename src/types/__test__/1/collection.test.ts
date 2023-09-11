import type { Connections } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import { testClient, genConnections, closeConnections } from '../utils'

declare global {
  // eslint-disable-next-line no-var
  var connections: Connections
}

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
  globalThis.connections = connections
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const articleGlobalId1 = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
const articleGlobalId4 = toGlobalId({ type: NODE_TYPES.Article, id: 4 })

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
const DEL_COLLECTIONS = /* GraphQL */ `
  mutation ($input: DeleteCollectionsInput!) {
    deleteCollections(input: $input)
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

describe('get viewer collections', () => {
  test('not logged-in user', async () => {
    const server = await testClient()
    const { data, errors } = await server.executeOperation({
      query: GET_VIEWER_COLLECTIONS,
    })
    expect(data?.viewer?.collections?.totalCount).toBe(0)
    expect(errors).toBeUndefined()
  })

  test('logged-in user', async () => {
    const server = await testClient({ isAuth: true })
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
    const server = await testClient()
    const { errors } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test' } },
    })
    expect(errors?.[0]?.message).toBe(
      '"visitor" isn\'t authorized for "putCollection"'
    )
  })
  test('users w/o username can not mutate collections', async () => {
    const server = await testClient({ noUserName: true })
    const { errors } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test' } },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
  test('long title/description is not allowed', async () => {
    const server = await testClient({ isAuth: true })
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
      const server = await testClient({ isAuth: true })
      const { errors } = await server.executeOperation({
        query: PUT_COLLECTION,
        variables: { input: { title: 'test', cover: 'invalid cover' } },
      })
      expect(errors?.[0]?.message).toBe('Asset does not exists')
    })

    test('assset not exists in db', async () => {
      const server = await testClient({ isAuth: true })
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
      const server = await testClient({ isAuth: true })
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
      const server = await testClient({ isAuth: true })
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
      const server = await testClient({ isAuth: true })
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
      const server2 = await testClient({ isAuth: true, isMatty: true })
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
      const server = await testClient({ isAuth: true })
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any
  let id: string
  let othersId: string
  beforeAll(async () => {
    server = await testClient({ isAuth: true })
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test' } },
    })
    id = data?.putCollection?.id
    const othersServer = await testClient({ isAuth: true, isMatty: true })
    const { data: data2 } = await othersServer.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'test' } },
    })
    othersId = data2?.putCollection?.id
  })
  test('not logged-in users can not mutate collections', async () => {
    const server2 = await testClient()
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
    server = await testClient({ isAuth: true })
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
    const visitorServer = await testClient()
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
          collections: Array(200).fill(collectionId1),
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
    const server2 = await testClient({ isAuth: true, isMatty: true })
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
    const { data } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId1, collectionId2],
          articles: [],
        },
      },
    })
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

    const { data: data2 } = await server.executeOperation({
      query: ADD_COLLECTIONS_ARTICLES,
      variables: {
        input: {
          collections: [collectionId1],
          articles: [articleGlobalId4],
        },
      },
    })
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
    server = await testClient({ isAuth: true })
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'my collection' } },
    })
    collectionId = data?.putCollection?.id
    const othersServer = await testClient({ isAuth: true, isMatty: true })
    const { data: data2 } = await othersServer.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'others collection' } },
    })
    othersCollectionId = data2?.putCollection?.id
  })
  test('not logged-in users can not mutate collections', async () => {
    const visitorServer = await testClient()
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any
  let collectionId: string
  beforeAll(async () => {
    server = await testClient({ isAuth: true })
    const { data } = await server.executeOperation({
      query: PUT_COLLECTION,
      variables: { input: { title: 'my collection' } },
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
  test('success', async () => {
    const { data } = await server.executeOperation({
      query: REORDER_COLLECTION_ARTICLES,
      variables: {
        input: {
          collection: collectionId,
          moves: { item: articleGlobalId1, newPosition: 0 },
        },
      },
    })
    expect(data?.reorderCollectionArticles.articles.edges[0].node.id).toBe(
      articleGlobalId1
    )
  })
})

describe('update pinned', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any
  let collectionId: string
  const title = 'my collection'
  beforeAll(async () => {
    server = await testClient({ isAuth: true })
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any
  let collectionId: string
  beforeAll(async () => {
    server = await testClient({ isAuth: true })
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
