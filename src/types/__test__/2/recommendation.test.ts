import type { Connections } from 'definitions'

import {
  NODE_TYPES,
  MATTERS_CHOICE_TOPIC_STATE,
  USER_STATE,
} from 'common/enums'
import {
  RecommendationService,
  AtomService,
  ArticleService,
  MomentService,
  UserService,
} from 'connectors'
import { toGlobalId } from 'common/utils'

import { testClient, genConnections, closeConnections } from '../utils'

let connections: Connections
let recommendationService: RecommendationService
let atomService: AtomService
let articleService: ArticleService
let momentService: MomentService
let userService: UserService

beforeAll(async () => {
  connections = await genConnections()
  recommendationService = new RecommendationService(connections)
  articleService = new ArticleService(connections)
  atomService = new AtomService(connections)
  momentService = new MomentService(connections)
  userService = new UserService(connections)
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
                ... on UserPostMomentActivity {
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

    // one moment activity
    const moment1 = await momentService.create({ content: 'test' }, followee1)
    await refreshView()

    const { errors: errors1, data: data1 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors1).toBeUndefined()
    expect(data1.viewer.recommendation.following.totalCount).toBe(1)
    expect(data1.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment1.id })
    )

    // two same actor moment activities in series
    const moment2 = await momentService.create({ content: 'test' }, followee1)
    await refreshView()

    const { errors: errors2, data: data2 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors2).toBeUndefined()
    expect(data2.viewer.recommendation.following.totalCount).toBe(2)
    expect(data2.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment2.id })
    )
    expect(data2.viewer.recommendation.following.edges[1].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment1.id })
    )

    // three same actor moment activities in series will be combined into one activity
    const moment3 = await momentService.create({ content: 'test' }, followee1)
    await refreshView()

    const { errors: errors3, data: data3 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors3).toBeUndefined()
    expect(data3.viewer.recommendation.following.totalCount).toBe(1)
    expect(data3.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment3.id })
    )
    expect(data3.viewer.recommendation.following.edges[0].node.more[0].id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment2.id })
    )
    expect(data3.viewer.recommendation.following.edges[0].node.more[1].id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment1.id })
    )

    // other actor moment activities will not reset the combination time window
    const moment4 = await momentService.create({ content: 'test' }, followee2)
    const moment5 = await momentService.create({ content: 'test' }, followee1)
    await refreshView()

    const { errors: errors4, data: data4 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors4).toBeUndefined()
    expect(data4.viewer.recommendation.following.totalCount).toBe(2)
    expect(data4.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment5.id })
    )
    expect(data4.viewer.recommendation.following.edges[1].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment4.id })
    )

    // same actor other activities will  reset the combination time window
    const [article] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: followee1.id,
    })
    const moment6 = await momentService.create({ content: 'test' }, followee1)
    await refreshView()

    const { errors: errors5, data: data5 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors5).toBeUndefined()
    expect(data5.viewer.recommendation.following.totalCount).toBe(4)
    expect(data5.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment6.id })
    )
    expect(data5.viewer.recommendation.following.edges[1].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: article.id })
    )
    expect(data5.viewer.recommendation.following.edges[2].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment5.id })
    )
    expect(data5.viewer.recommendation.following.edges[3].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment4.id })
    )

    // article only
    const { errors: errors6, data: data6 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10, filter: { type: 'article' } } },
    })
    expect(errors6).toBeUndefined()
    expect(data6.viewer.recommendation.following.totalCount).toBe(1)
    expect(data6.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: article.id })
    )
  })
  test('visitor return empty result', async () => {
    const server = await testClient({
      connections,
    })
    const { errors: emptyErrors, data: emptyData } =
      await server.executeOperation({
        query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
        variables: { input: { first: 10 } },
      })
    expect(emptyErrors).toBeUndefined()
    expect(emptyData.viewer.recommendation.following.totalCount).toBe(0)
  })
})
