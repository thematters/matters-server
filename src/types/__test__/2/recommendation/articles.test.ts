import type { Connections, Article, GlobalId } from '#definitions/index.js'
import type { Knex } from 'knex'

import _ from 'lodash'
import _get from 'lodash/get.js'

import {
  MATERIALIZED_VIEW,
  ARTICLE_STATE,
  PAYMENT_CURRENCY,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  FEATURE_NAME,
  FEATURE_FLAG,
  DEFAULT_TAKE_PER_PAGE,
} from '#common/enums/index.js'
import {
  AtomService,
  ArticleService,
  PaymentService,
  CampaignService,
  SystemService,
  UserService,
} from '#connectors/index.js'
import { fromGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'
import {
  createTx,
  refreshView,
  createCampaign,
} from '#connectors/__test__/utils.js'

let connections: Connections
let atomService: AtomService
let articleService: ArticleService
let paymentService: PaymentService
let campaignService: CampaignService
let systemService: SystemService
let userService: UserService

beforeAll(async () => {
  connections = await genConnections()
  articleService = new ArticleService(connections)
  atomService = new AtomService(connections)
  paymentService = new PaymentService(connections)
  campaignService = new CampaignService(connections)
  systemService = new SystemService(connections)
  userService = new UserService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
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
  // TODO: move hottest query to service and test spam filter logic there
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
      variables: { input: { first: 1 } },
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
      variables: { input: { first: 2 } },
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
      variables: { input: { first: 3 } },
    })
    expect(data3.viewer.recommendation.hottest.totalCount).toBe(1)
  })
})

const GET_VIEWER_RECOMMENDATION = (list: string) => /* GraphQL */ `
query($first: first_Int_min_0, $after: String) {
  viewer {
    recommendation {
      ${list}(input: { first: $first, after: $after }) {
        totalCount
        edges {
          node {
            ...on Article {
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

describe('user recommendations', () => {
  let knex: Knex
  // from src/queries/user/recommendation/newest.ts
  const MAX_TAKE = DEFAULT_TAKE_PER_PAGE * 50
  beforeAll(async () => {
    knex = connections.knex
  })
  test('retrieve articles from hottest, newest and icymi', async () => {
    await createTx(
      {
        senderId: '2',
        recipientId: '1',
        purpose: TRANSACTION_PURPOSE.donation,
        currency: PAYMENT_CURRENCY.HKD,
        state: TRANSACTION_STATE.succeeded,
        targetId: '1',
      },
      paymentService
    )

    await refreshView(MATERIALIZED_VIEW.article_hottest_materialized, knex)

    const lists = ['hottest', 'newest', 'icymi']
    for (const list of lists) {
      const serverNew = await testClient({
        isAuth: true,
        connections,
      })

      const { data: data1, errors: errors1 } = await serverNew.executeOperation(
        {
          query: GET_VIEWER_RECOMMENDATION(list),
          variables: { first: 1 },
        }
      )
      expect(errors1).toBeUndefined()
      const article = _get(data1, `viewer.recommendation.${list}.edges.0.node`)
      expect(fromGlobalId(article.id).type).toBe('Article')
      const count = _get(data1, `viewer.recommendation.${list}.totalCount`)
      expect(count).toBeGreaterThan(0)

      // test pagination
      const { errors: errors2 } = await serverNew.executeOperation({
        query: GET_VIEWER_RECOMMENDATION(list),
        variables: { first: 1, after: article.id },
      })
      expect(errors2).toBeUndefined()
    }
  })

  test('articleHottest restricted authors not show in hottest', async () => {
    const getAuthorIds = (data: any) =>
      data!
        .viewer!.recommendation!.hottest!.edges.map(
          ({
            node: {
              author: { id },
            },
          }: {
            node: { author: { id: string } }
          }) => id
        )
        .map((id: GlobalId) => fromGlobalId(id).id)

    await refreshView(MATERIALIZED_VIEW.article_hottest_materialized, knex)
    // before restricted
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data: data1 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION('hottest'),
      variables: { first: 10 },
    })
    const authorIdsBefore = getAuthorIds(data1)

    const restrictedUserId = '1'
    expect(authorIdsBefore).toContain(restrictedUserId)

    // after restricted
    await userService.addRestriction('1', 'articleHottest')

    const { data: data2 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION('hottest'),
      variables: { first: 11 },
    })
    const authorIdsAfter = getAuthorIds(data2)
    expect(authorIdsAfter).not.toContain(restrictedUserId)
  })

  test('articleNewest restricted authors not show in newest', async () => {
    const getAuthorIds = (data: any) =>
      data!
        .viewer!.recommendation!.newest!.edges.map(
          ({
            node: {
              author: { id },
            },
          }: {
            node: { author: { id: string } }
          }) => id
        )
        .map((id: GlobalId) => fromGlobalId(id).id)

    // before restricted
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data: data1 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION('newest'),
      variables: { first: 10 },
    })
    const authorIdsBefore = getAuthorIds(data1)

    const restrictedUserId = '1'
    expect(authorIdsBefore).toContain(restrictedUserId)

    // after restricted
    await userService.addRestriction('1', 'articleNewest')

    const { data: data2 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION('newest'),
      variables: { first: 10 },
    })
    const authorIdsAfter = getAuthorIds(data2)
    expect(authorIdsAfter).not.toContain(restrictedUserId)

    await knex('user_restriction').delete()
  })

  test('newest respects maxTake limit for regular users', async () => {
    // create more than MAX_TAKE articles
    await Promise.all(
      Array.from({ length: MAX_TAKE + 1 }, (_, i) =>
        articleService.createArticle({
          authorId: '1',
          title: `Test Article ${i}`,
          content: `Test Content ${i}`,
        })
      )
    )

    const server = await testClient({
      isAuth: true,
      userId: '2', // regular user
      connections,
    })

    // Try to fetch more than the default limit
    const { data } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION('newest'),
      variables: { first: 1 },
    })

    // Should be limited to DEFAULT_TAKE_PER_PAGE * 50
    expect(data.viewer.recommendation.newest.totalCount).toBeLessThanOrEqual(
      MAX_TAKE
    )
  }, 30000)

  test('newest allows unlimited fetch for users with unlimitedArticleFetch flag', async () => {
    // make sure there are more than MAX_TAKE articles
    const spamThreshold = await systemService.getSpamThreshold()
    const records = await articleService.latestArticles({
      spamThreshold: spamThreshold ?? undefined,
    })
    expect(records.length).toBeGreaterThan(MAX_TAKE)

    const userId = '3'
    // Add unlimitedArticleFetch feature flag to user
    await userService.addFeatureFlag(userId, 'unlimitedArticleFetch')
    const server = await testClient({
      isAuth: true,
      userId,
      connections,
    })
    // Try to fetch more than the default limit
    const { data } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION('newest'),
      variables: { first: 1 },
    })

    // Should return all available articles
    expect(data.viewer.recommendation.newest.totalCount).toBeGreaterThan(0)
    // The actual count should be higher than the default limit
    expect(data.viewer.recommendation.newest.totalCount).toBeGreaterThan(
      MAX_TAKE
    )
  }, 30000)
})
