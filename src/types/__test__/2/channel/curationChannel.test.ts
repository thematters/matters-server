import type {
  Connections,
  CurationChannel,
  Article,
} from '#definitions/index.js'

import {
  NODE_TYPES,
  CURATION_CHANNEL_COLOR,
  CURATION_CHANNEL_STATE,
  ARTICLE_STATE,
} from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import {
  AtomService,
  ChannelService,
  PublicationService,
} from '#connectors/index.js'
import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections
let atomService: AtomService
let channelService: ChannelService
let publicationService: PublicationService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  channelService = new ChannelService(connections)
  publicationService = new PublicationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('manage curation channels', () => {
  const PUT_CURATION_CHANNEL = /* GraphQL */ `
    mutation ($input: PutCurationChannelInput!) {
      putCurationChannel(input: $input) {
        id
        shortHash
        nameEn: name(input: { language: en })
        nameZhHant: name(input: { language: zh_hant })
        noteEn: note(input: { language: en })
        noteZhHant: note(input: { language: zh_hant })
        navbarTitleEn: navbarTitle(input: { language: en })
        navbarTitleZhHant: navbarTitle(input: { language: zh_hant })
        pinAmount
        color
        activePeriod {
          start
          end
        }
        state
        showRecommendation
      }
    }
  `

  test('non-admin users cannot create/update curation channels', async () => {
    const nonAuthServer = await testClient({ connections })

    const { errors } = await nonAuthServer.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [{ text: 'test', language: 'en' }],
        },
      },
    })
    expect(errors[0].extensions.code).toBe('FORBIDDEN')

    const nonAdminServer = await testClient({
      connections,
      isAuth: true,
    })

    const { errors: nonAdminErrors } = await nonAdminServer.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [{ text: 'test', language: 'en' }],
        },
      },
    })

    expect(nonAdminErrors[0].extensions.code).toBe('FORBIDDEN')
  })

  test('create new curation channel successfully', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7) // 7 days from now

    const { data, errors } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [
            { text: 'Test Channel', language: 'en' },
            { text: '測試頻道', language: 'zh_hant' },
          ],
          note: [
            { text: 'Test Note', language: 'en' },
            { text: '測試備註', language: 'zh_hant' },
          ],
          pinAmount: 5,
          color: CURATION_CHANNEL_COLOR.pink,
          activePeriod: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          state: CURATION_CHANNEL_STATE.published,
          showRecommendation: true,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putCurationChannel.nameEn).toBe('Test Channel')
    expect(data.putCurationChannel.nameZhHant).toBe('測試頻道')
    expect(data.putCurationChannel.noteEn).toBe('Test Note')
    expect(data.putCurationChannel.noteZhHant).toBe('測試備註')
    expect(data.putCurationChannel.pinAmount).toBe(5)
    expect(data.putCurationChannel.color).toBe(CURATION_CHANNEL_COLOR.pink)
    expect(data.putCurationChannel.state).toBe(CURATION_CHANNEL_STATE.published)
    expect(data.putCurationChannel.showRecommendation).toBe(true)
    expect(new Date(data.putCurationChannel.activePeriod.start)).toBeInstanceOf(
      Date
    )
    expect(new Date(data.putCurationChannel.activePeriod.end)).toBeInstanceOf(
      Date
    )
  })

  test('update existing curation channel', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // First create a channel
    const { data: createData, errors: createErrors } =
      await server.executeOperation({
        query: PUT_CURATION_CHANNEL,
        variables: {
          input: {
            name: [{ text: 'Initial Name', language: 'en' }],
            state: CURATION_CHANNEL_STATE.editing,
            showRecommendation: false,
          },
        },
      })
    expect(createErrors).toBeUndefined()

    // Then update it
    const { data: updateData, errors: updateErrors } =
      await server.executeOperation({
        query: PUT_CURATION_CHANNEL,
        variables: {
          input: {
            id: createData.putCurationChannel.id,
            name: [{ text: 'Updated Name', language: 'en' }],
            pinAmount: 10,
            color: CURATION_CHANNEL_COLOR.red,
            state: CURATION_CHANNEL_STATE.published,
            showRecommendation: true,
          },
        },
      })

    expect(updateErrors).toBeUndefined()
    expect(updateData.putCurationChannel.nameEn).toBe('Updated Name')
    expect(updateData.putCurationChannel.pinAmount).toBe(10)
    expect(updateData.putCurationChannel.color).toBe(CURATION_CHANNEL_COLOR.red)
    expect(updateData.putCurationChannel.state).toBe(
      CURATION_CHANNEL_STATE.published
    )
    expect(updateData.putCurationChannel.showRecommendation).toBe(true)
  })

  test('validates datetime range', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 7) // start date after end date

    const { errors } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [{ text: 'Test Channel', language: 'en' }],
          activePeriod: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        },
      },
    })

    expect(errors[0].message).toBe('Invalid datetime range')
  })

  test('handles partial updates', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create initial channel
    const { data: createData } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [{ text: 'Initial Name', language: 'en' }],
          note: [{ text: 'Initial Note', language: 'en' }],
          pinAmount: 5,
          color: CURATION_CHANNEL_COLOR.pink,
          state: CURATION_CHANNEL_STATE.editing,
          showRecommendation: false,
        },
      },
    })

    // Update only some fields
    const { data: updateData, errors } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          id: createData.putCurationChannel.id,
          pinAmount: 15,
          showRecommendation: true,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(updateData.putCurationChannel.nameEn).toBe('Initial Name')
    expect(updateData.putCurationChannel.noteEn).toBe('Initial Note')
    expect(updateData.putCurationChannel.pinAmount).toBe(15)
    expect(updateData.putCurationChannel.color).toBe(
      CURATION_CHANNEL_COLOR.pink
    )
    expect(updateData.putCurationChannel.state).toBe(
      CURATION_CHANNEL_STATE.editing
    )
    expect(updateData.putCurationChannel.showRecommendation).toBe(true)
  })

  test('creates curation channel with navbarTitle successfully', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [
            { text: 'Test Channel', language: 'en' },
            { text: '測試頻道', language: 'zh_hant' },
          ],
          navbarTitle: [
            { text: 'Nav Title', language: 'en' },
            { text: '導航標題', language: 'zh_hant' },
          ],
          state: CURATION_CHANNEL_STATE.editing,
          showRecommendation: true,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putCurationChannel.nameEn).toBe('Test Channel')
    expect(data.putCurationChannel.nameZhHant).toBe('測試頻道')
    expect(data.putCurationChannel.navbarTitleEn).toBe('Nav Title')
    expect(data.putCurationChannel.navbarTitleZhHant).toBe('導航標題')
    expect(data.putCurationChannel.showRecommendation).toBe(true)
  })

  test('updates curation channel navbarTitle successfully', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // First create a channel
    const { data: createData, errors: createErrors } =
      await server.executeOperation({
        query: PUT_CURATION_CHANNEL,
        variables: {
          input: {
            name: [{ text: 'Initial Name', language: 'en' }],
            navbarTitle: [{ text: 'Initial Nav Title', language: 'en' }],
            state: CURATION_CHANNEL_STATE.editing,
            showRecommendation: false,
          },
        },
      })
    expect(createErrors).toBeUndefined()

    // Then update navbarTitle
    const { data: updateData, errors: updateErrors } =
      await server.executeOperation({
        query: PUT_CURATION_CHANNEL,
        variables: {
          input: {
            id: createData.putCurationChannel.id,
            navbarTitle: [{ text: 'Updated Nav Title', language: 'en' }],
            showRecommendation: true,
          },
        },
      })

    expect(updateErrors).toBeUndefined()
    expect(updateData.putCurationChannel.nameEn).toBe('Initial Name')
    expect(updateData.putCurationChannel.navbarTitleEn).toBe(
      'Updated Nav Title'
    )
    expect(updateData.putCurationChannel.showRecommendation).toBe(true)
  })

  test('validates navbarTitle length', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const longNavbarTitle = 'a'.repeat(33) // 33 characters, exceeds 32 limit

    const { errors } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [{ text: 'Test Channel', language: 'en' }],
          navbarTitle: [{ text: longNavbarTitle, language: 'en' }],
        },
      },
    })

    expect(errors[0].message).toBe('Navbar title is too long')
  })

  test('navbarTitle falls back to name when not provided', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [
            { text: 'Test Channel', language: 'en' },
            { text: '測試頻道', language: 'zh_hant' },
          ],
          state: CURATION_CHANNEL_STATE.editing,
          showRecommendation: false,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putCurationChannel.nameEn).toBe('Test Channel')
    expect(data.putCurationChannel.nameZhHant).toBe('測試頻道')
    expect(data.putCurationChannel.navbarTitleEn).toBe('Test Channel')
    expect(data.putCurationChannel.navbarTitleZhHant).toBe('測試頻道')
    expect(data.putCurationChannel.showRecommendation).toBe(false)
  })

  test('creates and updates curation channel with showRecommendation field', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create channel with showRecommendation: false
    const { data: createData, errors: createErrors } =
      await server.executeOperation({
        query: PUT_CURATION_CHANNEL,
        variables: {
          input: {
            name: [{ text: 'Test Channel', language: 'en' }],
            state: CURATION_CHANNEL_STATE.editing,
            showRecommendation: false,
          },
        },
      })
    expect(createErrors).toBeUndefined()
    expect(createData.putCurationChannel.showRecommendation).toBe(false)

    // Update to showRecommendation: true
    const { data: updateData, errors: updateErrors } =
      await server.executeOperation({
        query: PUT_CURATION_CHANNEL,
        variables: {
          input: {
            id: createData.putCurationChannel.id,
            showRecommendation: true,
          },
        },
      })

    expect(updateErrors).toBeUndefined()
    expect(updateData.putCurationChannel.showRecommendation).toBe(true)
    expect(updateData.putCurationChannel.nameEn).toBe('Test Channel') // Other fields unchanged
  })
})

describe('addCurationChannelArticles', () => {
  const ADD_CURATION_CHANNEL_ARTICLES = /* GraphQL */ `
    mutation ($input: AddCurationChannelArticlesInput!) {
      addCurationChannelArticles(input: $input) {
        id
        name
        articles(input: { first: 10 }) {
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

  let channel: CurationChannel
  let articles: Article[]

  beforeEach(async () => {
    // Create test channel
    channel = await channelService.createCurationChannel({
      name: 'test-channel',
      pinAmount: 3,
    })

    // Get some test articles
    articles = await atomService.findMany({
      table: 'article',
      where: {},
      take: 3,
    })
    expect(articles).toHaveLength(3)
  })

  test('adds articles to channel successfully', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: ADD_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: articles.map((a) =>
            toGlobalId({ type: NODE_TYPES.Article, id: a.id })
          ),
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.addCurationChannelArticles.id).toBe(
      toGlobalId({ type: NODE_TYPES.CurationChannel, id: channel.id })
    )
    expect(data.addCurationChannelArticles.articles.totalCount).toBe(3)
    expect(data.addCurationChannelArticles.articles.edges).toHaveLength(3)
  })

  test('requires authentication', async () => {
    const server = await testClient({ connections })

    const { errors } = await server.executeOperation({
      query: ADD_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: articles.map((a) =>
            toGlobalId({ type: NODE_TYPES.Article, id: a.id })
          ),
        },
      },
    })

    expect(errors[0].extensions.code).toBe('FORBIDDEN')
  })

  test('requires admin role', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    const { errors } = await server.executeOperation({
      query: ADD_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: articles.map((a) =>
            toGlobalId({ type: NODE_TYPES.Article, id: a.id })
          ),
        },
      },
    })

    expect(errors[0].extensions.code).toBe('FORBIDDEN')
  })

  test('validates channel ID', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: ADD_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({ type: NODE_TYPES.Article, id: '1' }), // Wrong type
          articles: articles.map((a) =>
            toGlobalId({ type: NODE_TYPES.Article, id: a.id })
          ),
        },
      },
    })

    expect(errors[0].message).toBe('Invalid channel ID')
  })

  test('validates article IDs', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: ADD_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: [toGlobalId({ type: NODE_TYPES.User, id: '1' })], // Wrong type
        },
      },
    })

    expect(errors[0].message).toBe('Invalid article ID')
  })

  test('handles non-existent channel', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: ADD_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: '0',
          }),
          articles: articles.map((a) =>
            toGlobalId({ type: NODE_TYPES.Article, id: a.id })
          ),
        },
      },
    })

    expect(errors[0].message).toBe('Channel not found')
  })

  test('handles non-existent articles', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: ADD_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: [toGlobalId({ type: NODE_TYPES.Article, id: '0' })],
        },
      },
    })

    expect(errors[0].message).toBe('Some articles not found')
  })

  test('handles inactive articles', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create an inactive article
    const [inactiveArticle] = await publicationService.createArticle({
      title: 'Inactive Article',
      authorId: '1',
      content: 'Inactive content',
    })
    await atomService.update({
      table: 'article',
      where: { id: inactiveArticle.id },
      data: {
        state: ARTICLE_STATE.archived,
      },
    })

    const { errors } = await server.executeOperation({
      query: ADD_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: [
            toGlobalId({ type: NODE_TYPES.Article, id: inactiveArticle.id }),
          ],
        },
      },
    })

    expect(errors[0].message).toBe('Some articles not found')
  })

  test('handles duplicate article IDs', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: ADD_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: [
            toGlobalId({ type: NODE_TYPES.Article, id: articles[0].id }),
            toGlobalId({ type: NODE_TYPES.Article, id: articles[0].id }), // Duplicate
          ],
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.addCurationChannelArticles.articles.totalCount).toBe(1) // Only one unique article added
  })
})

describe('deleteCurationChannelArticles', () => {
  const DELETE_CURATION_CHANNEL_ARTICLES = /* GraphQL */ `
    mutation ($input: DeleteCurationChannelArticlesInput!) {
      deleteCurationChannelArticles(input: $input) {
        id
        name
        articles(input: { first: 10 }) {
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

  let channel: CurationChannel
  let articles: Article[]

  beforeEach(async () => {
    // Create test channel
    channel = await channelService.createCurationChannel({
      name: 'test-channel',
      pinAmount: 3,
    })

    // Get some test articles
    articles = await atomService.findMany({
      table: 'article',
      where: {},
      take: 3,
    })
    expect(articles).toHaveLength(3)

    // Add articles to channel
    await channelService.addArticlesToCurationChannel({
      channelId: channel.id,
      articleIds: articles.map((a) => a.id),
    })
  })

  test('deletes articles from channel successfully', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: DELETE_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: articles
            .slice(0, 2)
            .map((a) => toGlobalId({ type: NODE_TYPES.Article, id: a.id })),
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.deleteCurationChannelArticles.id).toBe(
      toGlobalId({ type: NODE_TYPES.CurationChannel, id: channel.id })
    )
    expect(data.deleteCurationChannelArticles.articles.totalCount).toBe(1)
    expect(data.deleteCurationChannelArticles.articles.edges).toHaveLength(1)
    expect(data.deleteCurationChannelArticles.articles.edges[0].node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: articles[2].id })
    )
  })

  test('requires authentication', async () => {
    const server = await testClient({ connections })

    const { errors } = await server.executeOperation({
      query: DELETE_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: articles.map((a) =>
            toGlobalId({ type: NODE_TYPES.Article, id: a.id })
          ),
        },
      },
    })

    expect(errors[0].extensions.code).toBe('FORBIDDEN')
  })

  test('requires admin role', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    const { errors } = await server.executeOperation({
      query: DELETE_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: articles.map((a) =>
            toGlobalId({ type: NODE_TYPES.Article, id: a.id })
          ),
        },
      },
    })

    expect(errors[0].extensions.code).toBe('FORBIDDEN')
  })

  test('validates channel ID', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: DELETE_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({ type: NODE_TYPES.Article, id: '1' }), // Wrong type
          articles: articles.map((a) =>
            toGlobalId({ type: NODE_TYPES.Article, id: a.id })
          ),
        },
      },
    })

    expect(errors[0].message).toBe('Invalid channel ID')
  })

  test('validates article IDs', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: DELETE_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: [toGlobalId({ type: NODE_TYPES.User, id: '1' })], // Wrong type
        },
      },
    })

    expect(errors[0].message).toBe('Invalid article IDs')
  })

  test('handles non-existent channel', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: DELETE_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: '0',
          }),
          articles: articles.map((a) =>
            toGlobalId({ type: NODE_TYPES.Article, id: a.id })
          ),
        },
      },
    })

    expect(errors[0].message).toBe('Channel not found')
  })

  test('handles empty article list', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: DELETE_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: [],
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.deleteCurationChannelArticles.id).toBe(
      toGlobalId({ type: NODE_TYPES.CurationChannel, id: channel.id })
    )
    expect(data.deleteCurationChannelArticles.articles.totalCount).toBe(3) // No changes
  })

  test('handles deleting non-existent articles', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: DELETE_CURATION_CHANNEL_ARTICLES,
      variables: {
        input: {
          channel: toGlobalId({
            type: NODE_TYPES.CurationChannel,
            id: channel.id,
          }),
          articles: [toGlobalId({ type: NODE_TYPES.Article, id: '0' })],
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.deleteCurationChannelArticles.articles.totalCount).toBe(3) // No changes
  })
})
