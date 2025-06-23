import type { Connections, TopicChannel } from '#definitions/index.js'

import {
  TOPIC_CHANNEL_FEEDBACK_TYPE,
  TOPIC_CHANNEL_FEEDBACK_STATE,
} from '#common/enums/index.js'

import { ChannelService, AtomService } from '#connectors/index.js'
import { genConnections } from '../utils.js'

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
      expect(feedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.RESOLVED)

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
      expect(feedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.RESOLVED)
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
  })

  describe('findFeedbacks', () => {
    beforeEach(async () => {
      // Create test feedbacks
      await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE,
          articleId: '1',
          userId: '1',
        },
      })

      await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          articleId: '2',
          userId: '2',
          state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
          channelIds: JSON.stringify([]) as unknown as string[],
        },
      })

      await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          articleId: '3',
          userId: '3',
          state: TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED,
          channelIds: JSON.stringify([]) as unknown as string[],
        },
      })
    })

    test('returns all feedbacks when no filters are provided', async () => {
      const feedbacks = await channelService.findFeedbacks()
      expect(feedbacks).toHaveLength(3)
    })

    test('filters feedbacks by type', async () => {
      const feedbacks = await channelService.findFeedbacks({
        type: TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE,
      })
      expect(feedbacks).toHaveLength(1)
      expect(feedbacks[0].type).toBe(TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE)
    })

    test('filters feedbacks by state', async () => {
      const feedbacks = await channelService.findFeedbacks({
        state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
      })
      expect(feedbacks).toHaveLength(1)
      expect(feedbacks[0].state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.PENDING)
    })

    test('filters feedbacks by both type and state', async () => {
      const feedbacks = await channelService.findFeedbacks({
        type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
        state: TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED,
      })
      expect(feedbacks).toHaveLength(1)
      expect(feedbacks[0].type).toBe(TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE)
      expect(feedbacks[0].state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED)
    })

    test('applies spam threshold filter when provided', async () => {
      // Create an article with spam score
      await atomService.update({
        table: 'article',
        where: {
          id: '1',
        },
        data: {
          isSpam: true,
        },
      })

      const feedbacks1 = await channelService.findFeedbacks({
        spamThreshold: 0.6,
      })
      expect(feedbacks1).toHaveLength(2)
      const feedbacks2 = await channelService
        .findFeedbacks({
          spamThreshold: 0.6,
          state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
        })
        .orderBy('id')
      expect(feedbacks2).toHaveLength(1)
    })
  })

  describe('acceptFeedback', () => {
    test('accepts feedback and updates article channels when autoAccept is true and channelIds is empty', async () => {
      // Create test article channels
      await atomService.create({
        table: 'topic_channel_article',
        data: {
          articleId: '1',
          channelId: channel1.id,
          enabled: true,
        },
      })

      // Create feedback
      const feedback = await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          articleId: '1',
          userId: '1',
          state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
          channelIds: JSON.stringify([]) as unknown as string[],
        },
      })

      await channelService.acceptFeedback(feedback, true)

      // Verify feedback state is updated
      const updatedFeedback = await atomService.findFirst({
        table: 'topic_channel_feedback',
        where: { id: feedback.id },
      })
      expect(updatedFeedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.RESOLVED)

      // Verify article channels are disabled
      const articleChannels = await atomService.findMany({
        table: 'topic_channel_article',
        where: { articleId: '1' },
      })
      expect(articleChannels.every((channel) => !channel.enabled)).toBe(true)
    })

    test('accepts feedback and updates article channels with specific channelIds', async () => {
      // Create test article channels
      await atomService.create({
        table: 'topic_channel_article',
        data: {
          articleId: '1',
          channelId: channel1.id,
          enabled: true,
        },
      })

      // Create feedback
      const feedback = await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          articleId: '1',
          userId: '1',
          state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
          channelIds: JSON.stringify([channel2.id]) as unknown as string[],
        },
      })

      await channelService.acceptFeedback(feedback)

      // Verify feedback state is updated
      const updatedFeedback = await atomService.findFirst({
        table: 'topic_channel_feedback',
        where: { id: feedback.id },
      })
      expect(updatedFeedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED)

      // Verify article channels are updated
      const articleChannels = await atomService.findMany({
        table: 'topic_channel_article',
        where: { articleId: '1', enabled: true },
      })
      expect(articleChannels).toHaveLength(1)
      expect(articleChannels[0].channelId).toBe(channel2.id)
    })
  })

  describe('rejectFeedback', () => {
    test('rejects feedback and updates state', async () => {
      const feedback = await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          articleId: '1',
          userId: '1',
          state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
          channelIds: JSON.stringify([channel1.id]) as unknown as string[],
        },
      })

      await channelService.rejectFeedback(feedback)

      const updatedFeedback = await atomService.findFirst({
        table: 'topic_channel_feedback',
        where: { id: feedback.id },
      })
      expect(updatedFeedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.REJECTED)
    })
  })

  describe('resolveArticleFeedback', () => {
    test('resolves feedback when conditions are met', async () => {
      // Create test article channels
      await atomService.create({
        table: 'topic_channel_article',
        data: {
          articleId: '1',
          channelId: channel1.id,
          enabled: true,
        },
      })

      // Create feedback
      const feedback = await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          articleId: '1',
          userId: '1',
          state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
          channelIds: JSON.stringify([channel1.id]) as unknown as string[],
        },
      })

      await channelService.resolveArticleFeedback('1')

      // Verify feedback state is updated
      const updatedFeedback = await atomService.findFirst({
        table: 'topic_channel_feedback',
        where: { id: feedback.id },
      })
      expect(updatedFeedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.RESOLVED)
    })

    test('does not resolve feedback when state is not pending', async () => {
      // Create feedback with non-pending state
      const feedback = await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          articleId: '1',
          userId: '1',
          state: TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED,
          channelIds: JSON.stringify([channel1.id]) as unknown as string[],
        },
      })

      await channelService.resolveArticleFeedback('1')

      // Verify feedback state remains unchanged
      const updatedFeedback = await atomService.findFirst({
        table: 'topic_channel_feedback',
        where: { id: feedback.id },
      })
      expect(updatedFeedback?.state).toBe(TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED)
    })

    test('does not resolve feedback when feedback is not found', async () => {
      await channelService.resolveArticleFeedback('2')
      // No feedback should be created or updated
      const feedbacks = await atomService.findMany({
        table: 'topic_channel_feedback',
        where: { articleId: '2' },
      })
      expect(feedbacks).toHaveLength(0)
    })
  })
})
