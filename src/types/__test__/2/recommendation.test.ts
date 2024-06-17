import type { Connections } from 'definitions'

import {
  NODE_TYPES,
  MATTERS_CHOICE_TOPIC_STATE,
  USER_STATE,
} from 'common/enums'
import {
  RecommendationService,
  AtomService,
  JournalService,
  UserService,
} from 'connectors'
import { toGlobalId } from 'common/utils'

import { testClient, genConnections, closeConnections } from '../utils'

let connections: Connections
let atomService: AtomService
let journalService: JournalService
let userService: UserService
let recommendationService: RecommendationService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  journalService = new JournalService(connections)
  userService = new UserService(connections)
  recommendationService = new RecommendationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('icymi', () => {
  const GET_VIEWER_RECOMMENDATION_ICYMI = /* GraphQL */ `
    query ($input: ConnectionArgs!) {
      viewer {
        recommendation {
          icymi(input: $input) {
            totalCount
            edges {
              node {
                ... on Article {
                  id
                  author {
                    id
                  }
                  slug
                  state
                  cover
                  summary
                  mediaHash
                  dataHash
                  iscnId
                  createdAt
                  revisedAt
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  `
  test('query', async () => {
    const server = await testClient({ connections })
    await atomService.create({
      table: 'matters_choice',
      data: { articleId: '1' },
    })
    const { errors, data } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_ICYMI,
      variables: { input: { first: 10 } },
    })
    expect(errors).toBeUndefined()
    expect(data.viewer.recommendation.icymi.totalCount).toBeGreaterThan(0)
  })
})

describe('icymi topic', () => {
  describe('oss', () => {
    const PUT_ICYMI_TOPIC = /* GraphQL */ `
      mutation ($input: PutIcymiTopicInput!) {
        putIcymiTopic(input: $input) {
          id
          title
          articles {
            id
          }
          note
          pinAmount
          state
          publishedAt
          archivedAt
        }
      }
    `
    const GET_OSS_ICYMI_TOPIC = /* GraphQL */ `
      query ($input: NodeInput!) {
        node(input: $input) {
          id
          ... on IcymiTopic {
            title
            articles {
              id
            }
            note
            state
            publishedAt
            archivedAt
          }
        }
      }
    `
    const GET_OSS_ICYMI_TOPICS = /* GraphQL */ `
      query ($input: ConnectionArgs!) {
        oss {
          icymiTopics(input: $input) {
            totalCount
            edges {
              node {
                id
                ... on IcymiTopic {
                  title
                  articles {
                    id
                  }
                  note
                  state
                  publishedAt
                  archivedAt
                }
              }
            }
          }
        }
      }
    `
    const title = 'test title'
    const pinAmount = 3
    const articles = ['1', '2', '3'].map((id) =>
      toGlobalId({ type: NODE_TYPES.Article, id })
    )
    const note = 'test note'
    test('only admin can mutate icymit topic', async () => {
      const server = await testClient({ connections })
      const { errors: errorsVisitor } = await server.executeOperation({
        query: PUT_ICYMI_TOPIC,
        variables: { input: { title, articles, pinAmount, note } },
      })
      expect(errorsVisitor).toBeDefined()

      const authedServer = await testClient({ connections, isAuth: true })
      const { errors: errorsAuthed } = await authedServer.executeOperation({
        query: PUT_ICYMI_TOPIC,
        variables: { input: { title, articles, pinAmount, note } },
      })
      expect(errorsAuthed).toBeDefined()

      const adminServer = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })
      const { errors, data } = await adminServer.executeOperation({
        query: PUT_ICYMI_TOPIC,
        variables: { input: { title, articles, pinAmount, note } },
      })
      expect(errors).toBeUndefined()
      expect(data.putIcymiTopic.state).toBe(MATTERS_CHOICE_TOPIC_STATE.editing)
      expect(data.putIcymiTopic.pinAmount).toBe(3)
      expect(data.putIcymiTopic.articles.length).toBe(3)
      expect(data.putIcymiTopic.publishedAt).toBeNull()
      expect(data.putIcymiTopic.archivedAt).toBeNull()

      // only update fields provided
      const { data: data2, errors: errors2 } =
        await adminServer.executeOperation({
          query: PUT_ICYMI_TOPIC,
          variables: { input: { id: data.putIcymiTopic.id, pinAmount: 6 } },
        })
      expect(errors2).toBeUndefined()
      expect(data2.putIcymiTopic.pinAmount).toBe(6)
      expect(data2.putIcymiTopic.state).toBe(MATTERS_CHOICE_TOPIC_STATE.editing)
      expect(data2.putIcymiTopic.articles.length).toBe(3)
      expect(data2.putIcymiTopic.publishedAt).toBeNull()
      expect(data2.putIcymiTopic.archivedAt).toBeNull()
    })
    test('only admin can views icymit topics list', async () => {
      const server = await testClient({ connections })
      const { data: dataVisitor } = await server.executeOperation({
        query: GET_OSS_ICYMI_TOPICS,
        variables: { input: { first: 10 } },
      })
      expect(dataVisitor).toBeNull()

      const authedServer = await testClient({ connections, isAuth: true })
      const { data: dataAuthed } = await authedServer.executeOperation({
        query: GET_OSS_ICYMI_TOPICS,
        variables: { input: { first: 10 } },
      })
      expect(dataAuthed).toBe(null)

      const adminServer = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })
      const { errors, data } = await adminServer.executeOperation({
        query: GET_OSS_ICYMI_TOPICS,
        variables: { input: { first: 10 } },
      })
      expect(errors).toBeUndefined()
      expect(data.oss.icymiTopics.totalCount).toBeGreaterThan(0)
    })
    test('query icymi topic', async () => {
      const server = await testClient({ connections })
      const { data } = await server.executeOperation({
        query: GET_OSS_ICYMI_TOPIC,
        variables: {
          input: { id: toGlobalId({ type: NODE_TYPES.IcymiTopic, id: 1 }) },
        },
      })
      expect(data).toBeDefined()
    })
  })

  const GET_VIEWER_RECOMMENDATION_ICYMI_TOPIC = /* GraphQL */ `
    query {
      viewer {
        recommendation {
          icymiTopic {
            id
            title
            articles {
              id
            }
            note
            state
            publishedAt
            archivedAt
          }
        }
      }
    }
  `
  test('query null', async () => {
    const server = await testClient({ connections })
    await atomService.updateMany({
      table: 'matters_choice_topic',
      where: { state: MATTERS_CHOICE_TOPIC_STATE.published },
      data: { state: MATTERS_CHOICE_TOPIC_STATE.archived },
    })
    const { errors, data } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_ICYMI_TOPIC,
    })
    expect(errors).toBeUndefined()
    expect(data.viewer.recommendation.icymiTopic).toBeNull()
  })
  test('query', async () => {
    const title = 'test title 2'
    const articleIds = ['1', '2', '3']
    const topic = await recommendationService.createIcymiTopic({
      title,
      articleIds,
      pinAmount: 3,
    })
    await recommendationService.publishIcymiTopic(topic.id)
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_ICYMI_TOPIC,
    })
    expect(errors).toBeUndefined()
    expect(data.viewer.recommendation.icymiTopic.title).toBe(title)
    expect(data.viewer.recommendation.icymiTopic.articles.length).toBe(
      articleIds.length
    )
  })
})

describe('following', () => {
  const GET_VIEWER_RECOMMENDATION_FOLLOWING = /* GraphQL */ `
    query ($input: RecommendationFollowingInput!) {
      viewer {
        recommendation {
          following(input: $input) {
            totalCount
            edges {
              node {
                ... on UserPublishArticleActivity {
                  actor {
                    id
                  }
                  node {
                    id
                  }
                  createdAt
                }
                ... on UserPostJournalActivity {
                  actor {
                    id
                  }
                  node {
                    id
                  }
                  more {
                    id
                  }
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  `
  const viewer = { id: '4', state: USER_STATE.active, userName: 'test' }
  const followee1 = { id: '5', state: USER_STATE.active, userName: 'test' }
  const followee2 = { id: '6', state: USER_STATE.active, userName: 'test' }
  const refreshView = () =>
    connections.knex.raw('refresh materialized view user_activity_materialized')

  beforeAll(async () => {
    await userService.follow(viewer.id, followee1.id)
    await userService.follow(viewer.id, followee2.id)
    await refreshView()
  })

  test('query', async () => {
    // no activities
    const server = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const { errors: emptyErrors, data: emptyData } =
      await server.executeOperation({
        query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
        variables: { input: { first: 10 } },
      })
    expect(emptyErrors).toBeUndefined()
    expect(emptyData.viewer.recommendation.following.totalCount).toBe(0)

    // one journal activity
    const journal1 = await journalService.create({ content: 'test' }, followee1)
    await refreshView()

    const { errors: errors1, data: data1 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors1).toBeUndefined()
    console.log(data1)
    expect(data1.viewer.recommendation.following.totalCount).toBe(1)
  })
  test('visitor return empty result', async () => {})
})
