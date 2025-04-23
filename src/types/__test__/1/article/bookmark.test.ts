import type { Connections } from '#definitions/index.js'
import { NODE_TYPES } from '#common/enums/index.js'
import { AtomService } from '#connectors/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const GET_ARTICLE = /* GraphQL */ `
  query ($input: ArticleInput!) {
    article(input: $input) {
      id
      bookmarkCount
    }
  }
`

const TOGGLE_BOOKMARK_ARTICLE = /* GraphQL */ `
  mutation ($input: ToggleItemInput!) {
    toggleBookmarkArticle(input: $input) {
      subscribed
    }
  }
`

describe('toggle article bookmark', () => {
  test('bookmark an article', async () => {
    const TEST_ARTICLE_ID = '1'
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: TOGGLE_BOOKMARK_ARTICLE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: TEST_ARTICLE_ID }),
          enabled: true,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.toggleBookmarkArticle.subscribed).toBe(true)

    const action = await atomService.findFirst({
      table: 'action_article',
      where: { targetId: TEST_ARTICLE_ID },
      orderBy: [{ column: 'id', order: 'desc' }],
    })
    expect(action.targetId).toBe(TEST_ARTICLE_ID)
    expect(action.articleVersionId).not.toBeNull()
  })

  test('unsubscribe an article ', async () => {
    const TEST_ARTICLE_ID = '1'
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: true,
    })
    const { data } = await server.executeOperation({
      query: TOGGLE_BOOKMARK_ARTICLE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: TEST_ARTICLE_ID }),
          enabled: false,
        },
      },
    })
    expect(data.toggleBookmarkArticle.subscribed).toBe(false)
  })

  test('query article bookmarkCount', async () => {
    const TEST_ARTICLE_ID = '4'
    const TEST_MEDIA_HASH = 'someIpfsMediaHash4'
    // First subscribe to the article
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    await server.executeOperation({
      query: TOGGLE_BOOKMARK_ARTICLE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: TEST_ARTICLE_ID }),
          enabled: true,
        },
      },
    })

    // Query the article to check bookmarkCount
    const { data } = await server.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: { mediaHash: TEST_MEDIA_HASH },
      },
    })
    expect(data.article.bookmarkCount).toBe(1)

    // Unsubscribe and check count again
    await server.executeOperation({
      query: TOGGLE_BOOKMARK_ARTICLE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: TEST_ARTICLE_ID }),
          enabled: false,
        },
      },
    })

    const { data: data2 } = await server.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: { mediaHash: TEST_MEDIA_HASH },
      },
    })
    expect(data2.article.bookmarkCount).toBe(0)
  })
})
