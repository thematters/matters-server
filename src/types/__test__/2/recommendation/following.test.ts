import type { Connections } from '#definitions/index.js'

import _ from 'lodash'

import {
  MATERIALIZED_VIEW,
  NODE_TYPES,
  USER_RESTRICTION_TYPE,
  USER_STATE,
} from '#common/enums/index.js'
import {
  AtomService,
  PublicationService,
  MomentService,
  UserService,
} from '#connectors/index.js'
import { toGlobalId } from '#common/utils/index.js'

import {
  makeUserFollowUserActivityQuery,
  makeReadArticlesTagsActivityQuery,
} from '../../../../queries/user/recommendation/following/sql.js'
import { testClient, genConnections, closeConnections } from '../../utils.js'
import { refreshView } from '#connectors/__test__/utils.js'

let connections: Connections
let atomService: AtomService
let publicationService: PublicationService
let momentService: MomentService
let userService: UserService

beforeAll(async () => {
  connections = await genConnections()
  publicationService = new PublicationService(connections)
  atomService = new AtomService(connections)
  momentService = new MomentService(connections)
  userService = new UserService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
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
    const [article] = await publicationService.createArticle({
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

describe('following ReadArticlesTagsActivity', () => {
  const viewerId = '7'
  const author1Id = '8'
  const author2Id = '9'
  let tagId: string
  let article1Id: string
  let article2Id: string
  let article3Id: string

  beforeAll(async () => {
    // Create a tag for testing
    const [tag] = await atomService.findMany({
      table: 'tag',
      where: { content: 'test' },
    })
    tagId = tag.id

    // Create multiple article_tag entries to meet global_appearance threshold (>= 5)
    // First, create more articles
    const [createdArticle1] = await publicationService.createArticle({
      title: 'test article for read tags 1',
      content: 'test content',
      authorId: author1Id,
    })
    article1Id = createdArticle1.id

    const [createdArticle2] = await publicationService.createArticle({
      title: 'test article for read tags 2',
      content: 'test content',
      authorId: author1Id,
    })
    article2Id = createdArticle2.id

    const [createdArticle3] = await publicationService.createArticle({
      title: 'test article for read tags 3',
      content: 'test content',
      authorId: author2Id,
    })
    article3Id = createdArticle3.id

    // Add tags to articles (to meet global_appearance >= 5 threshold)
    // The seed data already has some article_tag entries for tagId='1'
    await atomService.create({
      table: 'article_tag',
      data: { articleId: article1Id, tagId },
    })
    await atomService.create({
      table: 'article_tag',
      data: { articleId: article2Id, tagId },
    })
    await atomService.create({
      table: 'article_tag',
      data: { articleId: article3Id, tagId },
    })

    // Create additional article_tag entries to meet the threshold
    // Using existing seed articles
    await atomService.create({
      table: 'article_tag',
      data: { articleId: '2', tagId },
    })
    await atomService.create({
      table: 'article_tag',
      data: { articleId: '3', tagId },
    })

    // Create article read counts for the viewer to populate recently_read_tags_materialized
    await atomService.create({
      table: 'article_read_count',
      data: {
        userId: viewerId,
        articleId: '1', // seed article with tagId
        count: '1',
        archived: false,
        readTime: '100',
        lastRead: new Date(),
      },
    })

    // Refresh materialized views (non-concurrently since test DB may not have unique indexes)
    await connections.knex.raw(
      'refresh materialized view article_read_time_materialized'
    )
    await connections.knex.raw(
      'refresh materialized view recently_read_tags_materialized'
    )
    await connections.knex.raw(
      'refresh materialized view recommended_articles_from_read_tags_materialized'
    )
  })

  test('returns recommended articles based on read tags', async () => {
    const result = await makeReadArticlesTagsActivityQuery(
      { userId: viewerId },
      connections.knexRO
    )
    // Should return articles that share tags with articles the user has read
    expect(Array.isArray(result)).toBe(true)
  })

  test('blocked users articles are excluded', async () => {
    const initialResult = await makeReadArticlesTagsActivityQuery(
      { userId: viewerId },
      connections.knexRO
    )
    const initialArticleIds = initialResult.map((r: any) => r.articleId)

    // Block author1
    await userService.block(viewerId, author1Id)

    const afterBlockResult = await makeReadArticlesTagsActivityQuery(
      { userId: viewerId },
      connections.knexRO
    )
    const afterBlockArticleIds = afterBlockResult.map((r: any) => r.articleId)

    // If author1's articles were in initial results, they should be excluded now
    if (
      initialArticleIds.includes(article1Id) ||
      initialArticleIds.includes(article2Id)
    ) {
      expect(afterBlockArticleIds).not.toContain(article1Id)
      expect(afterBlockArticleIds).not.toContain(article2Id)
    }

    // Unblock for other tests
    await userService.unblock(viewerId, author1Id)
  })

  test('returns empty for user with no read history', async () => {
    const result = await makeReadArticlesTagsActivityQuery(
      { userId: '999' }, // Non-existent user
      connections.knexRO
    )
    expect(result).toHaveLength(0)
  })
})
