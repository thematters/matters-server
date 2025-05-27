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
      const feedback = await channelService.createNegativeFeedback({
        articleId,
        userId,
        channelIds: [],
      })

      expect(feedback).toBeDefined()
      expect(feedback?.type).toBe(TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE)
      expect(feedback?.channelIds).toEqual([])
    })
  })
})
