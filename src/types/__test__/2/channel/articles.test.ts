import type { Connections, TopicChannel, Article } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { genConnections, closeConnections, testClient } from '../../utils.js'
import { ChannelService, AtomService } from '#connectors/index.js'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const GET_CHANNEL_ARTICLES = /* GraphQL */ `
  query GetChannelArticles(
    $channelInput: ChannelInput!
    $articleInput: ChannelArticlesInput!
  ) {
    channel(input: $channelInput) {
      ... on TopicChannel {
        articles(input: $articleInput) {
          edges {
            pinned
            node {
              id
            }
          }
        }
      }
    }
  }
`

describe('TopicChannel.articles', () => {
  beforeEach(async () => {
    await atomService.deleteMany({ table: 'topic_channel_article' })
    await atomService.deleteMany({ table: 'topic_channel' })
  })

  describe('datetimeRange filtering', () => {
    let channel: TopicChannel
    let articles: Article[]
    const baseTime = new Date('2024-01-01T00:00:00Z')
    const oneDayBefore = new Date(baseTime.getTime() - 86400000)
    const oneDayAfter = new Date(baseTime.getTime() + 86400000)
    const twoDaysAfter = new Date(baseTime.getTime() + 172800000)

    beforeEach(async () => {
      channel = await channelService.createTopicChannel({
        name: 'test-topic',
        providerId: 'test-provider-id',
        enabled: true,
      })

      articles = await atomService.findMany({
        table: 'article',
        where: {},
        take: 4,
      })

      await Promise.all(
        articles.map((article) =>
          atomService.create({
            table: 'topic_channel_article',
            data: {
              articleId: article.id,
              channelId: channel.id,
              enabled: true,
            },
          })
        )
      )

      await atomService.update({
        table: 'topic_channel_article',
        where: { articleId: articles[0].id, channelId: channel.id },
        data: { createdAt: oneDayBefore, pinned: false }, // 1 day before
      })
      await atomService.update({
        table: 'topic_channel_article',
        where: { articleId: articles[1].id, channelId: channel.id },
        data: { createdAt: baseTime, pinned: false }, // exactly at start
      })
      await atomService.update({
        table: 'topic_channel_article',
        where: { articleId: articles[2].id, channelId: channel.id },
        data: { createdAt: oneDayAfter, pinned: false }, // 1 day after
      })
      await atomService.update({
        table: 'topic_channel_article',
        where: { articleId: articles[3].id, channelId: channel.id },
        data: { createdAt: twoDaysAfter, pinned: false }, // 2 days after
      })
    })

    test('filters articles within date range', async () => {
      const server = await testClient({ connections })

      const { data, errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges).toHaveLength(4)

      const { data: filteredData } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              dateTimeRange: { start: oneDayBefore, end: oneDayAfter },
            },
          },
        },
      })

      expect(filteredData?.channel.articles.edges).toHaveLength(3)
      expect(
        filteredData?.channel.articles.edges.map((e: any) => e.node.id)
      ).toEqual(
        expect.arrayContaining([
          toGlobalId({ type: NODE_TYPES.Article, id: articles[0].id }),
          toGlobalId({ type: NODE_TYPES.Article, id: articles[1].id }),
          toGlobalId({ type: NODE_TYPES.Article, id: articles[2].id }),
        ])
      )
    })

    test('filters articles with only start date', async () => {
      const server = await testClient({ connections })

      const { data, errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              dateTimeRange: { start: oneDayBefore },
            },
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges).toHaveLength(4)
      expect(data?.channel.articles.edges.map((e: any) => e.node.id)).toEqual(
        expect.arrayContaining([
          toGlobalId({ type: NODE_TYPES.Article, id: articles[0].id }),
          toGlobalId({ type: NODE_TYPES.Article, id: articles[1].id }),
          toGlobalId({ type: NODE_TYPES.Article, id: articles[2].id }),
          toGlobalId({ type: NODE_TYPES.Article, id: articles[3].id }),
        ])
      )
    })
  })
})
