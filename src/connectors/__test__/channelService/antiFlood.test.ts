import type { Connections, Article, TopicChannel } from '#definitions/index.js'

import { PublicationService } from '../../article/publicationService.js'
import { AtomService } from '../../atomService.js'
import { ChannelService } from '../../channel/channelService.js'
import { genConnections, closeConnections } from '../utils.js'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService
let publicationService: PublicationService
beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
  publicationService = new PublicationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

let channel: TopicChannel
let author1Articles: Article[]
let author2Articles: Article[]

beforeEach(async () => {
  await atomService.deleteMany({ table: 'topic_channel_article' })
  await atomService.deleteMany({ table: 'topic_channel' })

  channel = await channelService.createTopicChannel({
    name: 'test-channel',
    providerId: 'test-provider-id',
    enabled: true,
  })

  // Get test articles
  const author1 = '1'
  const author2 = '2'

  await publicationService.createArticle({
    authorId: author1,
    title: 'test-article-1',
    content: 'test-content-1',
  })
  author1Articles = (
    await atomService.findMany({
      table: 'article',
      where: {
        authorId: author1,
      },
    })
  ).slice(0, 4)

  author2Articles = await atomService.findMany({
    table: 'article',
    where: {
      authorId: author2,
    },
  })

  const now = new Date().getTime()
  const oneHourLater = new Date(now + 3600000)
  const twoHoursLater = new Date(now + 7200000)
  const oneDayLater = new Date(now + 86400000)

  await atomService.update({
    table: 'article',
    where: { id: author1Articles[1].id },
    data: { createdAt: oneHourLater },
  })
  await atomService.update({
    table: 'article',
    where: { id: author1Articles[2].id },
    data: { createdAt: twoHoursLater },
  })
  await atomService.update({
    table: 'article',
    where: { id: author1Articles[3].id },
    data: { createdAt: oneDayLater },
  })

  // Add articles to channel
  for (const article of author1Articles) {
    await channelService.setArticleTopicChannels({
      articleId: article.id,
      channelIds: [channel.id],
    })
  }
  await channelService.setArticleTopicChannels({
    articleId: author2Articles[0].id,
    channelIds: [channel.id],
  })
})

describe('filter out flood articles', () => {
  test('limits articles from same author within time window', async () => {
    const results = await channelService.findTopicChannelArticles(channel.id, {
      flood: false,
    })

    // Should only include 3 (2 today, and 1 tomorrow) articles from author1 (the first two chronologically)
    // and 1 article from author2
    expect(results).toHaveLength(4)

    const author1Results = results.filter((a) => a.authorId === '1')
    expect(author1Results).toHaveLength(3)
    expect(author1Results.map((a) => a.id)).toEqual([
      author1Articles[0].id,
      author1Articles[1].id,
      author1Articles[3].id,
    ])

    const author2Results = results.filter((a) => a.authorId === '2')
    expect(author2Results).toHaveLength(1)

    const isFlood = await channelService.isFlood({
      articleId: author1Articles[0].id,
      channelId: channel.id,
    })
    expect(isFlood).toBe(false)
  })
  test('returns flood articles when flood is true', async () => {
    const results = await channelService.findTopicChannelArticles(channel.id, {
      flood: true,
    })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(author1Articles[2].id)

    const isFlood = await channelService.isFlood({
      articleId: author1Articles[2].id,
      channelId: channel.id,
    })
    expect(isFlood).toBe(true)
  })
})
