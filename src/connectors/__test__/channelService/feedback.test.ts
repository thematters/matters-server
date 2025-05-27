import type { Connections, TopicChannel } from '#definitions/index.js'

import {
  TOPIC_CHANNEL_FEEDBACK_TYPE,
  TOPIC_CHANNEL_FEEDBACK_STATE,
} from '#common/enums/index.js'

import { ChannelService, AtomService } from '#connectors/index.js'
import { genConnections } from '../utils.js'
import { ActionLimitExceededError } from '#common/errors.js'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService
beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
}, 30000)

describe('feedback methods', () => {
  let channel1: TopicChannel
  let channel2: TopicChannel

  beforeAll(async () => {
    channel1 = await channelService.createTopicChannel({
      name: 'test-channel',
      providerId: '1',
      enabled: true,
    })
    channel2 = await channelService.createTopicChannel({
      name: 'test-channel-2',
      providerId: '2',
      enabled: true,
    })
  })

  beforeEach(async () => {
    await atomService.deleteMany({ table: 'topic_channel_feedback' })
    await atomService.deleteMany({ table: 'topic_channel_article' })
  })

  describe('createPositiveFeedback', () => {
    test('creates positive feedback with correct data', async () => {
      const articleId = '1'
      const userId = '1'
      await channelService.createPositiveFeedback({
        articleId,
        userId,
      })

      const feedback = await atomService.findFirst({
        table: 'topic_channel_feedback',
        where: { articleId, userId },
      })

      expect(feedback).toBeDefined()
      expect(feedback?.type).toBe(TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE)
      expect(feedback?.articleId).toBe(articleId)
      expect(feedback?.userId).toBe(userId)
      expect(feedback?.state).toBeNull()
      expect(feedback?.channelIds).toBeNull()
    })

    test('throws error when feedback already exists', async () => {
      const articleId = '1'
      const userId = '1'

      // Create initial feedback
      await channelService.createPositiveFeedback({
        articleId,
        userId,
      })

      // Attempt to create duplicate feedback
      await expect(
        channelService.createPositiveFeedback({
          articleId,
          userId,
        })
      ).rejects.toThrow(ActionLimitExceededError)
    })
  })

  describe('createNegativeFeedback', () => {
    test('creates negative feedback with correct data', async () => {
      const articleId = '1'
      const userId = '1'
      const channelIds = [channel1.id, channel2.id]
      const feedback = await channelService.createNegativeFeedback({
        articleId,
        userId,
        channelIds,
      })

      expect(feedback).toBeDefined()
      expect(feedback?.type).toBe(TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE)
      expect(feedback?.articleId).toBe(articleId)
      expect(feedback?.userId).toBe(userId)
      expect(feedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.PENDING)
      expect(feedback?.channelIds).toEqual(channelIds)
    })

    test('creates negative feedback with empty channelIds', async () => {
      const articleId = '1'
      const userId = '1'

      await atomService.create({
        table: 'topic_channel_article',
        data: {
          articleId,
          channelId: channel1.id,
          enabled: true,
        },
      })

      const feedback = await channelService.createNegativeFeedback({
        articleId,
        userId,
        channelIds: [],
      })

      expect(feedback).toBeDefined()
      expect(feedback?.type).toBe(TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE)
      expect(feedback?.channelIds).toEqual([])
      expect(feedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED)

      // Verify article channels are disabled
      const articleChannels = await atomService.findMany({
        table: 'topic_channel_article',
        where: { articleId },
      })
      expect(articleChannels.every((channel) => !channel.enabled)).toBe(true)
    })

    test('creates negative feedback with matching channelIds', async () => {
      const articleId = '1'
      const userId = '1'

      // First create article channels
      await atomService.create({
        table: 'topic_channel_article',
        data: {
          articleId,
          channelId: channel1.id,
          enabled: true,
        },
      })
      await atomService.create({
        table: 'topic_channel_article',
        data: {
          articleId,
          channelId: channel2.id,
          enabled: true,
        },
      })

      const feedback = await channelService.createNegativeFeedback({
        articleId,
        userId,
        channelIds: [channel1.id, channel2.id],
      })

      expect(feedback).toBeDefined()
      expect(feedback?.type).toBe(TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE)
      expect(feedback?.channelIds).toEqual([channel1.id, channel2.id])
      expect(feedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED)
    })

    test('creates negative feedback with non-matching channelIds', async () => {
      const articleId = '1'
      const userId = '1'

      // Create article channel with different channel
      await atomService.create({
        table: 'topic_channel_article',
        data: {
          articleId,
          channelId: channel1.id,
          enabled: true,
        },
      })

      const feedback = await channelService.createNegativeFeedback({
        articleId,
        userId,
        channelIds: [channel2.id], // Different from article channel
      })

      expect(feedback).toBeDefined()
      expect(feedback?.type).toBe(TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE)
      expect(feedback?.channelIds).toEqual([channel2.id])
      expect(feedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.PENDING)
    })

    test('throws error when feedback already exists', async () => {
      const articleId = '1'
      const userId = '1'
      const channelIds = [channel1.id]

      // Create initial feedback
      await channelService.createNegativeFeedback({
        articleId,
        userId,
        channelIds,
      })

      // Attempt to create duplicate feedback
      await expect(
        channelService.createNegativeFeedback({
          articleId,
          userId,
          channelIds,
        })
      ).rejects.toThrow(ActionLimitExceededError)
    })
  })
})
