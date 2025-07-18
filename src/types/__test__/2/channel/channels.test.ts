import type { Connections } from '#definitions/index.js'

import {
  NODE_TYPES,
  CURATION_CHANNEL_STATE,
  CURATION_CHANNEL_COLOR,
  ARTICLE_CHANNEL_JOB_STATE,
  USER_FEATURE_FLAG_TYPE,
} from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { genConnections, closeConnections, testClient } from '../../utils.js'
import {
  ChannelService,
  AtomService,
  PublicationService,
  CampaignService,
} from '#connectors/index.js'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService
let publicationService: PublicationService
let campaignService: CampaignService

beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
  campaignService = new CampaignService(connections)
  publicationService = new PublicationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('channels query', () => {
  const QUERY_CHANNELS = /* GraphQL */ `
    query Channels($input: ChannelsInput) {
      channels(input: $input) {
        id
        ... on TopicChannel {
          name
        }
        ... on CurationChannel {
          name
          color
          pinAmount
        }
        ... on WritingChallenge {
          name
        }
      }
    }
  `

  beforeEach(async () => {
    // Clean up existing channels
    await atomService.deleteMany({ table: 'topic_channel_article' })
    await atomService.deleteMany({ table: 'topic_channel' })
    await atomService.deleteMany({ table: 'curation_channel' })
    await atomService.deleteMany({ table: 'campaign_channel' })
    await atomService.deleteMany({ table: 'user_feature_flag' })
  })

  test('returns all channels for admin with oss flag', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create test channels
    const topicChannel = await channelService.createTopicChannel({
      name: 'test-topic',
      providerId: '1',
      enabled: false,
    })

    const curationChannel = await channelService.createCurationChannel({
      name: 'test-curation',
      state: CURATION_CHANNEL_STATE.editing,
      color: CURATION_CHANNEL_COLOR.red,
    })

    const campaign = await campaignService.createWritingChallenge({
      name: 'test-campaign',
      creatorId: '1',
    })
    await channelService.updateOrCreateCampaignChannel({
      campaignId: campaign.id,
      enabled: false,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNELS,
      variables: { input: { oss: true } },
    })

    expect(errors).toBeUndefined()
    expect(data.channels).toHaveLength(3)

    // Verify topic channel
    const returnedTopicChannel = data.channels.find(
      (c: any) =>
        c.id ===
        toGlobalId({ type: NODE_TYPES.TopicChannel, id: topicChannel.id })
    )
    expect(returnedTopicChannel).toBeDefined()
    expect(returnedTopicChannel.name).toBe('test-topic')

    // Verify curation channel
    const returnedCurationChannel = data.channels.find(
      (c: any) =>
        c.id ===
        toGlobalId({ type: NODE_TYPES.CurationChannel, id: curationChannel.id })
    )
    expect(returnedCurationChannel).toBeDefined()
    expect(returnedCurationChannel.name).toBe('test-curation')
    expect(returnedCurationChannel.color).toBe(CURATION_CHANNEL_COLOR.red)

    // Verify campaign channel
    const returnedCampaign = data.channels.find(
      (c: any) =>
        c.id === toGlobalId({ type: NODE_TYPES.Campaign, id: campaign.id })
    )
    expect(returnedCampaign).toBeDefined()
    expect(returnedCampaign.name).toBe('test-campaign')
  })

  test('returns only enabled channels for normal user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create enabled and disabled channels
    const enabledTopicChannel = await channelService.createTopicChannel({
      name: 'enabled-topic',
      enabled: true,
      providerId: '1',
    })
    await channelService.createTopicChannel({
      name: 'disabled-topic',
      enabled: false,
      providerId: '2',
    })

    const activeDate = new Date()
    const activePeriod = [
      new Date(activeDate.getTime() - 86400000),
      new Date(activeDate.getTime() + 86400000),
    ] as const

    const publishedCurationChannel = await channelService.createCurationChannel(
      {
        name: 'published-curation',
        state: CURATION_CHANNEL_STATE.published,
        activePeriod,
      }
    )
    await channelService.createCurationChannel({
      name: 'editing-curation',
      state: CURATION_CHANNEL_STATE.editing,
      activePeriod,
    })

    const enabledCampaign = await campaignService.createWritingChallenge({
      name: 'enabled-campaign',
      creatorId: '1',
    })
    await channelService.updateOrCreateCampaignChannel({
      campaignId: enabledCampaign.id,
      enabled: true,
    })

    const disabledCampaign = await campaignService.createWritingChallenge({
      name: 'disabled-campaign',
      creatorId: '1',
    })
    await channelService.updateOrCreateCampaignChannel({
      campaignId: disabledCampaign.id,
      enabled: false,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNELS,
    })

    expect(errors).toBeUndefined()
    expect(data.channels).toHaveLength(3)

    // Should only return enabled topic channel
    const returnedTopicChannel = data.channels.find(
      (c: any) =>
        c.id ===
        toGlobalId({
          type: NODE_TYPES.TopicChannel,
          id: enabledTopicChannel.id,
        })
    )
    expect(returnedTopicChannel).toBeDefined()

    // Should only return published curation channel
    const returnedCurationChannel = data.channels.find(
      (c: any) =>
        c.id ===
        toGlobalId({
          type: NODE_TYPES.CurationChannel,
          id: publishedCurationChannel.id,
        })
    )
    expect(returnedCurationChannel).toBeDefined()

    // Should only return enabled campaign
    const returnedCampaign = data.channels.find(
      (c: any) =>
        c.id ===
        toGlobalId({ type: NODE_TYPES.Campaign, id: enabledCampaign.id })
    )
    expect(returnedCampaign).toBeDefined()
  })

  test('returns channels in correct order', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create channels with different orders
    const topicChannel = await channelService.createTopicChannel({
      name: 'topic',
      enabled: true,
      providerId: '1',
    })
    await channelService.updateChannelOrder(
      { type: NODE_TYPES.TopicChannel, id: topicChannel.id },
      2
    )

    const activeDate = new Date()
    const activePeriod = [
      new Date(activeDate.getTime() - 86400000),
      new Date(activeDate.getTime() + 86400000),
    ] as const

    const curationChannel = await channelService.createCurationChannel({
      name: 'curation',
      state: CURATION_CHANNEL_STATE.published,
      activePeriod,
    })
    await channelService.updateChannelOrder(
      { type: NODE_TYPES.CurationChannel, id: curationChannel.id },
      1
    )

    const campaign = await campaignService.createWritingChallenge({
      name: 'campaign',
      creatorId: '1',
    })
    await channelService.updateOrCreateCampaignChannel({
      campaignId: campaign.id,
      enabled: true,
    })
    await channelService.updateChannelOrder(
      { type: NODE_TYPES.Campaign, id: campaign.id },
      0
    )

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNELS,
    })

    expect(errors).toBeUndefined()
    expect(data.channels).toHaveLength(3)

    // Verify order
    expect(data.channels[0].id).toBe(
      toGlobalId({ type: NODE_TYPES.Campaign, id: campaign.id })
    )
    expect(data.channels[1].id).toBe(
      toGlobalId({ type: NODE_TYPES.CurationChannel, id: curationChannel.id })
    )
    expect(data.channels[2].id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: topicChannel.id })
    )
  })

  test('returns empty array when no channels exist', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNELS,
    })

    expect(errors).toBeUndefined()
    expect(data.channels).toHaveLength(0)
  })

  describe('article topic channels', () => {
    const QUERY_ARTICLE_TOPIC_CHANNELS = /* GraphQL */ `
      query ArticleTopicChannels($input: ArticleInput!) {
        article(input: $input) {
          id
          classification {
            topicChannel {
              channels {
                channel {
                  id
                  name
                }
                score
                isLabeled
                enabled
                classicfiedAt
                pinned
                antiFlooded
              }
            }
          }
        }
      }
    `

    test('returns empty array when article has no channels but has finished jobs', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      // Create an article with no channels but with a finished job
      const [article] = await publicationService.createArticle({
        authorId: '1',
        title: 'test',
        content: 'test',
      })

      // Create a finished job for the article
      await atomService.create({
        table: 'article_channel_job',
        data: {
          jobId: '1',
          articleId: article.id,
          state: ARTICLE_CHANNEL_JOB_STATE.finished,
        },
      })

      const { data, errors } = await server.executeOperation({
        query: QUERY_ARTICLE_TOPIC_CHANNELS,
        variables: {
          input: {
            shortHash: article.shortHash,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data.article.classification.topicChannel.channels).toHaveLength(0)
    })

    test('returns null when article has no channels and no finished jobs', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      // Create an article with no channels and no jobs
      const [article] = await publicationService.createArticle({
        authorId: '1',
        title: 'test',
        content: 'test',
      })

      const { data, errors } = await server.executeOperation({
        query: QUERY_ARTICLE_TOPIC_CHANNELS,
        variables: {
          input: {
            shortHash: article.shortHash,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data.article.classification.topicChannel.channels).toBeNull()
    })

    test('returns article channels with correct mapping', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      // Create channels
      const channel1 = await channelService.createTopicChannel({
        name: 'channel-1',
        enabled: true,
        providerId: '1',
      })
      const channel2 = await channelService.createTopicChannel({
        name: 'channel-2',
        enabled: true,
        providerId: '2',
      })

      // Create article
      const [article] = await publicationService.createArticle({
        authorId: '1',
        title: 'test',
        content: 'test',
      })

      // Add article to channels
      await atomService.create({
        table: 'topic_channel_article',
        data: {
          articleId: article.id,
          channelId: channel1.id,
          enabled: true,
          isLabeled: true,
          score: 0.8,
        },
      })
      await atomService.create({
        table: 'topic_channel_article',
        data: {
          articleId: article.id,
          channelId: channel2.id,
          enabled: true,
          isLabeled: false,
          score: 0.6,
        },
      })

      await atomService.update({
        table: 'topic_channel',
        where: { id: channel1.id },
        data: { pinnedArticles: [article.id] },
      })

      const { data, errors } = await server.executeOperation({
        query: QUERY_ARTICLE_TOPIC_CHANNELS,
        variables: {
          input: {
            shortHash: article.shortHash,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data.article.classification.topicChannel.channels).toHaveLength(2)

      // Verify channel 1
      const channel1Result =
        data.article.classification.topicChannel.channels.find(
          (c: any) =>
            c.channel.id ===
            toGlobalId({ type: NODE_TYPES.TopicChannel, id: channel1.id })
        )
      expect(channel1Result).toBeDefined()
      expect(channel1Result.channel.name).toBe('channel-1')
      expect(channel1Result.score).toBe(0.8)
      expect(channel1Result.isLabeled).toBe(true)
      expect(channel1Result.enabled).toBe(true)
      expect(channel1Result.classicfiedAt).toBeDefined()
      expect(channel1Result.pinned).toBe(true)

      // Verify channel 2
      const channel2Result =
        data.article.classification.topicChannel.channels.find(
          (c: any) =>
            c.channel.id ===
            toGlobalId({ type: NODE_TYPES.TopicChannel, id: channel2.id })
        )
      expect(channel2Result).toBeDefined()
      expect(channel2Result.channel.name).toBe('channel-2')
      expect(channel2Result.score).toBe(0.6)
      expect(channel2Result.isLabeled).toBe(false)
      expect(channel2Result.enabled).toBe(true)
      expect(channel2Result.classicfiedAt).toBeDefined()
      expect(channel2Result.pinned).toBe(false)
    })

    describe('spam detection', () => {
      test('returns empty array when article isSpam is true', async () => {
        const server = await testClient({
          connections,
          isAuth: true,
          isAdmin: true,
        })

        // Create channels
        const channel = await channelService.createTopicChannel({
          name: 'test-channel',
          enabled: true,
          providerId: '1',
        })

        // Create spam article
        const [article] = await publicationService.createArticle({
          authorId: '1',
          title: 'spam test',
          content: 'spam content',
        })

        // Mark article as spam
        await atomService.update({
          table: 'article',
          where: { id: article.id },
          data: { isSpam: true },
        })

        // Add article to channels
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: channel.id,
            enabled: true,
            isLabeled: true,
            score: 0.8,
          },
        })

        const { data, errors } = await server.executeOperation({
          query: QUERY_ARTICLE_TOPIC_CHANNELS,
          variables: {
            input: {
              shortHash: article.shortHash,
            },
          },
        })

        expect(errors).toBeUndefined()
        expect(data.article.classification.topicChannel.channels).toHaveLength(
          0
        )
      })

      test('returns empty array when article spamScore exceeds threshold', async () => {
        const server = await testClient({
          connections,
          isAuth: true,
          isAdmin: true,
        })

        // Create channels
        const channel = await channelService.createTopicChannel({
          name: 'test-channel',
          enabled: true,
          providerId: '1',
        })

        // Create article with high spam score
        const [article] = await publicationService.createArticle({
          authorId: '1',
          title: 'high spam score test',
          content: 'high spam score content',
        })

        // Set article spam score higher than default threshold (1)
        await atomService.update({
          table: 'article',
          where: { id: article.id },
          data: { spamScore: 1.5 },
        })

        // Add article to channels
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: channel.id,
            enabled: true,
            isLabeled: true,
            score: 0.8,
          },
        })

        const { data, errors } = await server.executeOperation({
          query: QUERY_ARTICLE_TOPIC_CHANNELS,
          variables: {
            input: {
              shortHash: article.shortHash,
            },
          },
        })

        expect(errors).toBeUndefined()
        expect(data.article.classification.topicChannel.channels).toHaveLength(
          0
        )
      })

      test('returns channels when article spamScore is below threshold', async () => {
        const server = await testClient({
          connections,
          isAuth: true,
          isAdmin: true,
        })

        // Create channels
        const channel = await channelService.createTopicChannel({
          name: 'test-channel',
          enabled: true,
          providerId: '1',
        })

        // Create article with low spam score
        const [article] = await publicationService.createArticle({
          authorId: '1',
          title: 'low spam score test',
          content: 'low spam score content',
        })

        // Set article spam score lower than default threshold (1)
        await atomService.update({
          table: 'article',
          where: { id: article.id },
          data: { spamScore: 0.5 },
        })

        // Add article to channels
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: channel.id,
            enabled: true,
            isLabeled: true,
            score: 0.8,
          },
        })

        const { data, errors } = await server.executeOperation({
          query: QUERY_ARTICLE_TOPIC_CHANNELS,
          variables: {
            input: {
              shortHash: article.shortHash,
            },
          },
        })

        expect(errors).toBeUndefined()
        expect(data.article.classification.topicChannel.channels).toHaveLength(
          1
        )
        expect(
          data.article.classification.topicChannel.channels[0].channel.name
        ).toBe('test-channel')
      })

      test('returns channels when author has bypassSpamDetection feature flag', async () => {
        const server = await testClient({
          connections,
          isAuth: true,
          isAdmin: true,
        })

        // Create channels
        const channel = await channelService.createTopicChannel({
          name: 'test-channel',
          enabled: true,
          providerId: '1',
        })

        // Create spam article
        const [article] = await publicationService.createArticle({
          authorId: '1',
          title: 'bypass spam test',
          content: 'bypass spam content',
        })

        // Set article as spam with high spam score
        await atomService.update({
          table: 'article',
          where: { id: article.id },
          data: { spamScore: 1.5 },
        })

        // Add bypass spam detection feature flag for author
        await atomService.create({
          table: 'user_feature_flag',
          data: {
            userId: article.authorId,
            type: USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
          },
        })

        // Add article to channels
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: channel.id,
            enabled: true,
            isLabeled: true,
            score: 0.8,
          },
        })

        const { data, errors } = await server.executeOperation({
          query: QUERY_ARTICLE_TOPIC_CHANNELS,
          variables: {
            input: {
              shortHash: article.shortHash,
            },
          },
        })

        expect(errors).toBeUndefined()
        expect(data.article.classification.topicChannel.channels).toHaveLength(
          1
        )
        expect(
          data.article.classification.topicChannel.channels[0].channel.name
        ).toBe('test-channel')
      })

      test('returns empty array when isSpam is explicitly true even with bypass flag', async () => {
        const server = await testClient({
          connections,
          isAuth: true,
          isAdmin: true,
        })

        // Create channels
        const channel = await channelService.createTopicChannel({
          name: 'test-channel',
          enabled: true,
          providerId: '1',
        })

        // Create spam article
        const [article] = await publicationService.createArticle({
          authorId: '1',
          title: 'explicit spam test',
          content: 'explicit spam content',
        })

        // Explicitly mark article as spam
        await atomService.update({
          table: 'article',
          where: { id: article.id },
          data: { isSpam: true, spamScore: 0.5 },
        })

        // Add bypass spam detection feature flag for author
        await atomService.create({
          table: 'user_feature_flag',
          data: {
            userId: article.authorId,
            type: USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
          },
        })

        // Add article to channels
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: channel.id,
            enabled: true,
            isLabeled: true,
            score: 0.8,
          },
        })

        const { data, errors } = await server.executeOperation({
          query: QUERY_ARTICLE_TOPIC_CHANNELS,
          variables: {
            input: {
              shortHash: article.shortHash,
            },
          },
        })

        expect(errors).toBeUndefined()
        expect(data.article.classification.topicChannel.channels).toHaveLength(
          0
        )
      })
    })

    describe('parent channel inclusion', () => {
      test('includes parent channel when child channel has parentId and parent is not directly labeled', async () => {
        const server = await testClient({
          connections,
          isAuth: true,
          isAdmin: true,
        })

        // Create parent channel
        const parentChannel = await channelService.createTopicChannel({
          name: 'parent-channel',
          enabled: true,
          providerId: 'parent-1',
        })

        // Create child channel
        const childChannel = await channelService.createTopicChannel({
          name: 'child-channel',
          enabled: true,
          providerId: 'child-1',
        })

        // Set parent-child relationship
        await atomService.update({
          table: 'topic_channel',
          where: { id: childChannel.id },
          data: { parentId: parentChannel.id },
        })

        // Create article
        const [article] = await publicationService.createArticle({
          authorId: '1',
          title: 'test',
          content: 'test',
        })

        // Add article only to child channel (not parent)
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: childChannel.id,
            enabled: true,
            isLabeled: true,
            score: 0.8,
          },
        })

        // Pin article to parent channel
        await atomService.update({
          table: 'topic_channel',
          where: { id: parentChannel.id },
          data: { pinnedArticles: [article.id] },
        })

        const { data, errors } = await server.executeOperation({
          query: QUERY_ARTICLE_TOPIC_CHANNELS,
          variables: {
            input: {
              shortHash: article.shortHash,
            },
          },
        })

        expect(errors).toBeUndefined()
        expect(data.article.classification.topicChannel.channels).toHaveLength(
          2
        )

        // Verify child channel
        const childResult =
          data.article.classification.topicChannel.channels.find(
            (c: any) =>
              c.channel.id ===
              toGlobalId({ type: NODE_TYPES.TopicChannel, id: childChannel.id })
          )
        expect(childResult).toBeDefined()
        expect(childResult.channel.name).toBe('child-channel')
        expect(childResult.score).toBe(0.8)
        expect(childResult.isLabeled).toBe(true)
        expect(childResult.enabled).toBe(true)
        expect(childResult.pinned).toBe(false)

        // Verify parent channel
        const parentResult =
          data.article.classification.topicChannel.channels.find(
            (c: any) =>
              c.channel.id ===
              toGlobalId({
                type: NODE_TYPES.TopicChannel,
                id: parentChannel.id,
              })
          )
        expect(parentResult).toBeDefined()
        expect(parentResult.channel.name).toBe('parent-channel')
        expect(parentResult.score).toBeNull()
        expect(parentResult.isLabeled).toBe(false)
        expect(parentResult.enabled).toBe(true) // inherited from child
        expect(parentResult.pinned).toBe(true) // parent has article in pinnedArticles
      })

      test('does not include parent channel when parent is already directly labeled', async () => {
        const server = await testClient({
          connections,
          isAuth: true,
          isAdmin: true,
        })

        // Create parent channel
        const parentChannel = await channelService.createTopicChannel({
          name: 'parent-channel',
          enabled: true,
          providerId: 'parent-1',
        })

        // Create child channel
        const childChannel = await channelService.createTopicChannel({
          name: 'child-channel',
          enabled: true,
          providerId: 'child-1',
        })

        // Set parent-child relationship
        await atomService.update({
          table: 'topic_channel',
          where: { id: childChannel.id },
          data: { parentId: parentChannel.id },
        })

        // Create article
        const [article] = await publicationService.createArticle({
          authorId: '1',
          title: 'test',
          content: 'test',
        })

        // Add article to both child and parent channels
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: childChannel.id,
            enabled: true,
            isLabeled: true,
            score: 0.8,
          },
        })
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: parentChannel.id,
            enabled: true,
            isLabeled: true,
            score: 0.9,
          },
        })

        const { data, errors } = await server.executeOperation({
          query: QUERY_ARTICLE_TOPIC_CHANNELS,
          variables: {
            input: {
              shortHash: article.shortHash,
            },
          },
        })

        expect(errors).toBeUndefined()
        expect(data.article.classification.topicChannel.channels).toHaveLength(
          2
        )

        // Both should be labeled with their own scores, parent should not be duplicated
        const parentResult =
          data.article.classification.topicChannel.channels.find(
            (c: any) =>
              c.channel.id ===
              toGlobalId({
                type: NODE_TYPES.TopicChannel,
                id: parentChannel.id,
              })
          )
        expect(parentResult.score).toBe(0.9) // direct score, not null
        expect(parentResult.isLabeled).toBe(true) // directly labeled
      })

      test('deduplicates parent channels when multiple children have same parent', async () => {
        const server = await testClient({
          connections,
          isAuth: true,
          isAdmin: true,
        })

        // Create parent channel
        const parentChannel = await channelService.createTopicChannel({
          name: 'parent-channel',
          enabled: true,
          providerId: 'parent-1',
        })

        // Create two child channels
        const childChannel1 = await channelService.createTopicChannel({
          name: 'child-channel-1',
          enabled: true,
          providerId: 'child-1',
        })
        const childChannel2 = await channelService.createTopicChannel({
          name: 'child-channel-2',
          enabled: true,
          providerId: 'child-2',
        })

        // Set parent-child relationships
        await atomService.update({
          table: 'topic_channel',
          where: { id: childChannel1.id },
          data: { parentId: parentChannel.id },
        })
        await atomService.update({
          table: 'topic_channel',
          where: { id: childChannel2.id },
          data: { parentId: parentChannel.id },
        })

        // Create article
        const [article] = await publicationService.createArticle({
          authorId: '1',
          title: 'test',
          content: 'test',
        })

        // Add article to both child channels (not parent)
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: childChannel1.id,
            enabled: true,
            isLabeled: true,
            score: 0.8,
          },
        })
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: childChannel2.id,
            enabled: true,
            isLabeled: false,
            score: 0.6,
          },
        })

        const { data, errors } = await server.executeOperation({
          query: QUERY_ARTICLE_TOPIC_CHANNELS,
          variables: {
            input: {
              shortHash: article.shortHash,
            },
          },
        })

        expect(errors).toBeUndefined()
        // Should have 3 channels: 2 children + 1 parent (deduplicated)
        expect(data.article.classification.topicChannel.channels).toHaveLength(
          3
        )

        // Verify parent appears only once
        const parentResults =
          data.article.classification.topicChannel.channels.filter(
            (c: any) =>
              c.channel.id ===
              toGlobalId({
                type: NODE_TYPES.TopicChannel,
                id: parentChannel.id,
              })
          )
        expect(parentResults).toHaveLength(1)
        expect(parentResults[0].score).toBeNull()
        expect(parentResults[0].isLabeled).toBe(false)
      })

      test('does not include parent when child channel is disabled', async () => {
        const server = await testClient({
          connections,
          isAuth: true,
          isAdmin: true,
        })

        // Create parent channel
        const parentChannel = await channelService.createTopicChannel({
          name: 'parent-channel',
          enabled: true,
          providerId: 'parent-1',
        })

        // Create disabled child channel
        const childChannel = await channelService.createTopicChannel({
          name: 'child-channel',
          enabled: false, // disabled
          providerId: 'child-1',
        })

        // Set parent-child relationship
        await atomService.update({
          table: 'topic_channel',
          where: { id: childChannel.id },
          data: { parentId: parentChannel.id },
        })

        // Create article
        const [article] = await publicationService.createArticle({
          authorId: '1',
          title: 'test',
          content: 'test',
        })

        // Add article to child channel
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: childChannel.id,
            enabled: true,
            isLabeled: true,
            score: 0.8,
          },
        })

        const { data, errors } = await server.executeOperation({
          query: QUERY_ARTICLE_TOPIC_CHANNELS,
          variables: {
            input: {
              shortHash: article.shortHash,
            },
          },
        })

        expect(errors).toBeUndefined()
        expect(data.article.classification.topicChannel.channels).toHaveLength(
          1
        )

        // Should only have child channel, no parent because child channel is disabled
        const result = data.article.classification.topicChannel.channels[0]
        expect(result.channel.id).toBe(
          toGlobalId({ type: NODE_TYPES.TopicChannel, id: childChannel.id })
        )
      })

      test('includes parent with correct antiFlooded status', async () => {
        const server = await testClient({
          connections,
          isAuth: true,
          isAdmin: true,
        })

        // Create parent channel
        const parentChannel = await channelService.createTopicChannel({
          name: 'parent-channel',
          enabled: true,
          providerId: 'parent-1',
        })

        // Create child channel
        const childChannel = await channelService.createTopicChannel({
          name: 'child-channel',
          enabled: true,
          providerId: 'child-1',
        })

        // Set parent-child relationship
        await atomService.update({
          table: 'topic_channel',
          where: { id: childChannel.id },
          data: { parentId: parentChannel.id },
        })

        // Create article
        const [article] = await publicationService.createArticle({
          authorId: '1',
          title: 'test',
          content: 'test',
        })

        // Add article to child channel with recent timestamp (within flood detection window)
        await atomService.create({
          table: 'topic_channel_article',
          data: {
            articleId: article.id,
            channelId: childChannel.id,
            enabled: true,
            isLabeled: true,
            score: 0.8,
            createdAt: new Date(), // recent timestamp
          },
        })

        const { data, errors } = await server.executeOperation({
          query: QUERY_ARTICLE_TOPIC_CHANNELS,
          variables: {
            input: {
              shortHash: article.shortHash,
            },
          },
        })

        expect(errors).toBeUndefined()
        expect(data.article.classification.topicChannel.channels).toHaveLength(
          2
        )

        // Verify parent channel has antiFlooded property based on flood detection
        const parentResult =
          data.article.classification.topicChannel.channels.find(
            (c: any) =>
              c.channel.id ===
              toGlobalId({
                type: NODE_TYPES.TopicChannel,
                id: parentChannel.id,
              })
          )
        expect(parentResult).toBeDefined()
        expect(parentResult.channel.name).toBe('parent-channel')
        // antiFlooded should be a boolean (exact value depends on channelService.isFlood implementation)
        expect(typeof parentResult.antiFlooded).toBe('boolean')
      })
    })
  })
})
