import type {
  Connections,
  Article,
  User,
  TopicChannel,
} from '#definitions/index.js'

import {
  NODE_TYPES,
  TOPIC_CHANNEL_FEEDBACK_TYPE,
  TOPIC_CHANNEL_FEEDBACK_STATE,
  ARTICLE_STATE,
} from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { ChannelService, AtomService } from '#connectors/index.js'
import { genConnections, closeConnections } from '#connectors/__test__/utils.js'
import { testClient } from '../../utils.js'

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

describe('feedback resolvers', () => {
  let channel1: TopicChannel
  let channel2: TopicChannel
  let article: Article
  let user: User

  beforeAll(async () => {
    // Create test channels
    channel1 = await channelService.createTopicChannel({
      name: 'test-channel-1',
      providerId: '1',
      enabled: true,
    })
    channel2 = await channelService.createTopicChannel({
      name: 'test-channel-2',
      providerId: '2',
      enabled: true,
    })

    article = await atomService.findFirst({
      table: 'article',
      where: {
        state: ARTICLE_STATE.active,
      },
    })

    user = await atomService.findFirst({
      table: 'user',
      where: {
        id: article.authorId,
      },
    })
  })

  beforeEach(async () => {
    await atomService.deleteMany({ table: 'topic_channel_feedback' })
    await atomService.deleteMany({ table: 'topic_channel_article' })
  })

  describe('submitTopicChannelFeedback mutation', () => {
    const SUBMIT_FEEDBACK = /* GraphQL */ `
      mutation SubmitTopicChannelFeedback(
        $input: SubmitTopicChannelFeedbackInput!
      ) {
        submitTopicChannelFeedback(input: $input) {
          id
          type
          state
          article {
            id
          }
          channels {
            id
          }
        }
      }
    `

    test('submits positive feedback successfully', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        context: { viewer: user },
      })

      const { data, errors } = await server.executeOperation({
        query: SUBMIT_FEEDBACK,
        variables: {
          input: {
            article: toGlobalId({ type: NODE_TYPES.Article, id: article.id }),
            type: TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.submitTopicChannelFeedback).toBeDefined()
      expect(data?.submitTopicChannelFeedback.type).toBe(
        TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE
      )
      expect(data?.submitTopicChannelFeedback.state).toBeNull()
      expect(data?.submitTopicChannelFeedback.article.id).toBe(
        toGlobalId({ type: NODE_TYPES.Article, id: article.id })
      )
    })

    test('submits negative feedback successfully', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        context: { viewer: user },
      })

      const { data, errors } = await server.executeOperation({
        query: SUBMIT_FEEDBACK,
        variables: {
          input: {
            article: toGlobalId({ type: NODE_TYPES.Article, id: article.id }),
            type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
            channels: [
              toGlobalId({ type: NODE_TYPES.TopicChannel, id: channel1.id }),
              toGlobalId({ type: NODE_TYPES.TopicChannel, id: channel2.id }),
            ],
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.submitTopicChannelFeedback).toBeDefined()
      expect(data?.submitTopicChannelFeedback.type).toBe(
        TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE
      )
      expect(data?.submitTopicChannelFeedback.state).toBe(
        TOPIC_CHANNEL_FEEDBACK_STATE.PENDING
      )
      expect(data?.submitTopicChannelFeedback.channels).toHaveLength(2)
    })

    test('returns error for invalid article type', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        context: { viewer: user },
      })

      const { errors } = await server.executeOperation({
        query: SUBMIT_FEEDBACK,
        variables: {
          input: {
            article: toGlobalId({ type: NODE_TYPES.TopicChannel, id: '1' }),
            type: TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE,
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
    })

    test('returns error for non-author user', async () => {
      const nonAuthorUserId = '2'
      expect(nonAuthorUserId).not.toBe(article.authorId)
      const nonAuthorUser = await atomService.findFirst({
        table: 'user',
        where: {
          id: nonAuthorUserId,
        },
      })

      const server = await testClient({
        connections,
        isAuth: true,
        context: { viewer: nonAuthorUser },
      })

      const { errors } = await server.executeOperation({
        query: SUBMIT_FEEDBACK,
        variables: {
          input: {
            article: toGlobalId({ type: NODE_TYPES.Article, id: article.id }),
            type: TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE,
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
    })
  })
})
