import type { Connections, Article } from 'definitions'

import _ from 'lodash'

import {
  MATERIALIZED_VIEW,
  NODE_TYPES,
  MATTERS_CHOICE_TOPIC_STATE,
  USER_STATE,
  ARTICLE_STATE,
  PAYMENT_CURRENCY,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  USER_RESTRICTION_TYPE,
  FEATURE_NAME,
  FEATURE_FLAG,
} from 'common/enums'
import {
  RecommendationService,
  AtomService,
  ArticleService,
  MomentService,
  UserService,
  PaymentService,
  CampaignService,
  SystemService,
} from 'connectors'
import { toGlobalId } from 'common/utils'

import { makeUserFollowUserActivityQuery } from '../../../queries/user/recommendation/following/sql'
import { testClient, genConnections, closeConnections } from '../utils'
import {
  createTx,
  refreshView,
  createCampaign,
} from 'connectors/__test__/utils'

let connections: Connections
let recommendationService: RecommendationService
let atomService: AtomService
let articleService: ArticleService
let momentService: MomentService
let userService: UserService
let paymentService: PaymentService
let campaignService: CampaignService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  recommendationService = new RecommendationService(connections)
  articleService = new ArticleService(connections)
  atomService = new AtomService(connections)
  momentService = new MomentService(connections)
  userService = new UserService(connections)
  paymentService = new PaymentService(connections)
  campaignService = new CampaignService(connections)
  systemService = new SystemService(connections)
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

describe('following UserFollowUserActivity', () => {
  const viewerId = '1'
  const followerFollowerId1 = '4'
  const followerFollowerId2 = '5'
  const followerFollowerId3 = '6'
  const refreshView = () =>
    connections.knex.raw('refresh materialized view user_activity_materialized')
  beforeAll(async () => {
    await userService.follow(viewerId, '2')
    await userService.follow(viewerId, '3')
    // two viewer followers followed followerFollowerId1
    await userService.follow('2', followerFollowerId1)
    await userService.follow('3', followerFollowerId1)
    // one viewer follower followed followerFollowerId2
    await userService.follow('2', followerFollowerId2)
    // one viewer follower followed followerFollowerId3, which has more followees
    await userService.follow('3', followerFollowerId3)
    await userService.follow('7', followerFollowerId3)
    await refreshView()
  })
  test("ordered by viewer's followers amount then followees ammount", async () => {
    const result = await makeUserFollowUserActivityQuery(
      { userId: viewerId },
      connections.knexRO
    )
    expect(result.length).toBe(3)
    // ordered by followers amount
    expect(result[0].nodeId).toBe(followerFollowerId1)
    // then followees amount
    expect(result[1].nodeId).toBe(followerFollowerId3)
    expect(result[2].nodeId).toBe(followerFollowerId2)
  })
  test('followers are excluded', async () => {
    expect(
      await makeUserFollowUserActivityQuery(
        { userId: viewerId },
        connections.knexRO
      )
    ).toHaveLength(3)
    await userService.follow(viewerId, followerFollowerId1)
    expect(
      await makeUserFollowUserActivityQuery(
        { userId: viewerId },
        connections.knexRO
      )
    ).toHaveLength(2)
    await userService.unfollow(viewerId, followerFollowerId1)
  })
  test('blocked users are excluded', async () => {
    expect(
      await makeUserFollowUserActivityQuery(
        { userId: viewerId },
        connections.knexRO
      )
    ).toHaveLength(3)
    await userService.block(viewerId, followerFollowerId1)
    expect(
      await makeUserFollowUserActivityQuery(
        { userId: viewerId },
        connections.knexRO
      )
    ).toHaveLength(2)
    await userService.unblock(viewerId, followerFollowerId1)
  })
  test('restricted users are excluded', async () => {
    expect(
      await makeUserFollowUserActivityQuery(
        { userId: viewerId },
        connections.knexRO
      )
    ).toHaveLength(3)
    await userService.addRestriction(
      followerFollowerId1,
      USER_RESTRICTION_TYPE.articleHottest
    )
    expect(
      await makeUserFollowUserActivityQuery(
        { userId: viewerId },
        connections.knexRO
      )
    ).toHaveLength(2)
    await userService.removeRestriction(
      followerFollowerId1,
      USER_RESTRICTION_TYPE.articleHottest
    )
  })
  test('inactive users are excluded', async () => {
    expect(
      await makeUserFollowUserActivityQuery(
        { userId: viewerId },
        connections.knexRO
      )
    ).toHaveLength(3)
    await atomService.update({
      table: 'user',
      where: { id: followerFollowerId1 },
      data: { state: USER_STATE.archived },
    })
    expect(
      await makeUserFollowUserActivityQuery(
        { userId: viewerId },
        connections.knexRO
      )
    ).toHaveLength(2)
    await atomService.update({
      table: 'user',
      where: { id: followerFollowerId1 },
      data: { state: USER_STATE.active },
    })
  })
})

describe('following UserPostMomentActivity', () => {
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

  beforeAll(async () => {
    await userService.follow(viewer.id, followee1.id)
    await userService.follow(viewer.id, followee2.id)
    await refreshView(
      MATERIALIZED_VIEW.user_activity_materialized,
      connections.knex,
      false
    )
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
    await refreshView(
      MATERIALIZED_VIEW.user_activity_materialized,
      connections.knex,
      false
    )

    const { errors: errors1, data: data1 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors1).toBeUndefined()
    expect(data1.viewer.recommendation.following.totalCount).toBe(1)
    expect(data1.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment1.id })
    )

    // two same actor moment activities in series will not be combined
    const moment2 = await momentService.create({ content: 'test' }, followee1)
    await refreshView(
      MATERIALIZED_VIEW.user_activity_materialized,
      connections.knex,
      false
    )

    const { errors: errors2, data: data2 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors2).toBeUndefined()
    expect(data2.viewer.recommendation.following.totalCount).toBe(2)
    expect(data2.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment2.id })
    )
    expect(
      data2.viewer.recommendation.following.edges[0].node.more.length
    ).toBe(0)
    expect(data2.viewer.recommendation.following.edges[1].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment1.id })
    )
    expect(
      data2.viewer.recommendation.following.edges[1].node.more.length
    ).toBe(0)

    // three same actor moment activities in series will be combined into one activity
    const moment3 = await momentService.create({ content: 'test' }, followee1)
    const moment4 = await momentService.create({ content: 'test' }, followee1)
    await refreshView(
      MATERIALIZED_VIEW.user_activity_materialized,
      connections.knex,
      false
    )

    const { errors: errors3, data: data3 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors3).toBeUndefined()
    expect(data3.viewer.recommendation.following.totalCount).toBe(1)
    expect(data3.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment4.id })
    )
    expect(data3.viewer.recommendation.following.edges[0].node.more[0].id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment3.id })
    )
    expect(data3.viewer.recommendation.following.edges[0].node.more[1].id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment2.id })
    )
    expect(data3.viewer.recommendation.following.edges[0].node.more[2].id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment1.id })
    )

    // other actor moment activities will not reset the combination time window
    const moment5 = await momentService.create({ content: 'test' }, followee2)
    const moment6 = await momentService.create({ content: 'test' }, followee1)
    await refreshView(
      MATERIALIZED_VIEW.user_activity_materialized,
      connections.knex,
      false
    )

    const { errors: errors4, data: data4 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors4).toBeUndefined()
    expect(data4.viewer.recommendation.following.totalCount).toBe(2)
    expect(data4.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment6.id })
    )
    expect(data4.viewer.recommendation.following.edges[1].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment5.id })
    )

    // same actor other activities will reset the combination time window
    const [article] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: followee1.id,
    })
    const moment7 = await momentService.create({ content: 'test' }, followee1)
    await refreshView(
      MATERIALIZED_VIEW.user_activity_materialized,
      connections.knex,
      false
    )

    const { errors: errors5, data: data5 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors5).toBeUndefined()
    expect(data5.viewer.recommendation.following.totalCount).toBe(4)
    expect(data5.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment7.id })
    )
    expect(data5.viewer.recommendation.following.edges[1].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: article.id })
    )
    expect(data5.viewer.recommendation.following.edges[2].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment6.id })
    )
    expect(data5.viewer.recommendation.following.edges[3].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment5.id })
    )

    // archived moment will not be included
    await atomService.update({
      table: 'moment',
      where: { id: moment7.id },
      data: { state: 'archived' },
    })
    const { errors: errors6, data: data6 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10 } },
    })
    expect(errors6).toBeUndefined()
    expect(data6.viewer.recommendation.following.totalCount).toBe(3)
    expect(data6.viewer.recommendation.following.edges[0].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: article.id })
    )
    expect(data6.viewer.recommendation.following.edges[1].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment6.id })
    )
    expect(data6.viewer.recommendation.following.edges[2].node.node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Moment, id: moment5.id })
    )

    // article only
    const { errors: errors7, data: data7 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_FOLLOWING,
      variables: { input: { first: 10, filter: { type: 'article' } } },
    })
    expect(errors7).toBeUndefined()
    expect(data7.viewer.recommendation.following.totalCount).toBe(1)
    expect(data7.viewer.recommendation.following.edges[0].node.node.id).toBe(
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

describe('hottest articles', () => {
  const GET_VIEWER_RECOMMENDATION_HOTTEST = /* GraphQL */ `
    query ($input: ConnectionArgs!) {
      viewer {
        recommendation {
          hottest(input: $input) {
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
  let article: Article

  beforeAll(async () => {
    // make `max_efficiency` bigger than 0
    article = await atomService.findFirst({
      table: 'article',
      where: { state: ARTICLE_STATE.active },
    })
    const senderId = '3'
    expect(article.authorId).not.toBe(senderId)
    await articleService.read({ articleId: article.id, userId: senderId })
    // donate 1 HKD and `count_normal_transaction` (article_hottest_view internal value) will be 1
    await createTx(
      {
        senderId,
        recipientId: article.authorId,
        purpose: TRANSACTION_PURPOSE.donation,
        currency: PAYMENT_CURRENCY.HKD,
        state: TRANSACTION_STATE.succeeded,
        targetId: article.id,
        amount: 1,
      },
      paymentService
    )
    await refreshView(
      MATERIALIZED_VIEW.article_hottest_materialized,
      connections.knex
    )
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_HOTTEST,
      variables: { input: { first: 10 } },
    })
    expect(errors).toBeUndefined()
    expect(data.viewer.recommendation.hottest.totalCount).toBe(1)
  })

  test('tag_boost works', async () => {
    const { score, tagBoostEff, scorePrev } = await atomService.findFirst({
      table: 'article_hottest_view',
      where: { id: article.id },
    })
    expect(scorePrev * _.clamp(tagBoostEff, 0.5, 2)).toBe(score)
  })
  test('campaign_boost works', async () => {
    const [campaign] = await createCampaign(campaignService, article)
    const boost = 10
    await connections
      .knex('campaign_boost')
      .insert({ campaignId: campaign.id, boost })

    const { score, tagBoostEff, campaignBoostEff, scorePrev } =
      await atomService.findFirst({
        table: 'article_hottest_view',
        where: { id: article.id },
      })
    expect(campaignBoostEff).toBe(boost)
    expect(
      scorePrev *
        _.clamp(tagBoostEff, 0.5, 2) *
        _.clamp(campaignBoostEff, 0.5, 2)
    ).toBe(score)
  })
  test('spam are excluded', async () => {
    const spamThreshold = 0.5
    await systemService.setFeatureFlag({
      name: FEATURE_NAME.spam_detection,
      flag: FEATURE_FLAG.on,
      value: spamThreshold,
    })

    // both `is_spam` and `spam_score` are null, not excluded
    const server = await testClient({ connections })
    const { data: data1 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_HOTTEST,
      variables: { input: { first: 10 } },
    })
    expect(data1.viewer.recommendation.hottest.totalCount).toBe(1)

    // `spam_score` = `spam_threshold`, excluded
    await atomService.update({
      table: 'article',
      where: { id: article.id },
      data: { spamScore: spamThreshold },
    })
    const { data: data2 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_HOTTEST,
      variables: { input: { first: 10 } },
    })
    expect(data2.viewer.recommendation.hottest.totalCount).toBe(0)

    // `is_spam` = false, not excluded
    await atomService.update({
      table: 'article',
      where: { id: article.id },
      data: { isSpam: false },
    })
    const { data: data3 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_HOTTEST,
      variables: { input: { first: 10 } },
    })
    expect(data3.viewer.recommendation.hottest.totalCount).toBe(1)
  })
})
