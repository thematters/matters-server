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

  describe('topicChannelFeedbacks query', () => {
    const GET_TOPIC_CHANNEL_FEEDBACKS = /* GraphQL */ `
      query GetTopicChannelFeedbacks($input: TopicChannelFeedbacksInput!) {
        oss {
          topicChannelFeedbacks(input: $input) {
            edges {
              node {
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
            pageInfo {
              hasNextPage
              endCursor
            }
            totalCount
          }
        }
      }
    `
    beforeAll(async () => {
      await atomService.deleteMany({ table: 'topic_channel_feedback' })
    })

    test('returns empty connection when no feedbacks exist', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const {
        data: { oss },
        errors,
      } = await server.executeOperation({
        query: GET_TOPIC_CHANNEL_FEEDBACKS,
        variables: {
          input: {
            first: 10,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(oss?.topicChannelFeedbacks.edges).toHaveLength(0)
      expect(oss?.topicChannelFeedbacks.totalCount).toBe(0)
      expect(oss?.topicChannelFeedbacks.pageInfo.hasNextPage).toBe(false)
    })

    test('filters feedbacks by type and state', async () => {
      // Create test feedbacks
      const feedback1 = await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE,
          state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
          articleId: '1',
          userId: '1',
        },
      })
      await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          state: TOPIC_CHANNEL_FEEDBACK_STATE.REJECTED,
          articleId: '2',
          userId: '2',
          channelIds: JSON.stringify([]) as unknown as string[],
        },
      })

      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const {
        data: { oss },
        errors,
      } = await server.executeOperation({
        query: GET_TOPIC_CHANNEL_FEEDBACKS,
        variables: {
          input: {
            first: 10,
            filter: {
              type: TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE,
              state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
            },
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(oss?.topicChannelFeedbacks.edges).toHaveLength(1)
      expect(oss?.topicChannelFeedbacks.totalCount).toBe(1)
      expect(oss?.topicChannelFeedbacks.edges[0].node.id).toBe(
        toGlobalId({
          type: NODE_TYPES.TopicChannelFeedback,
          id: feedback1.id,
        })
      )
      expect(oss?.topicChannelFeedbacks.edges[0].node.article.id).toBe(
        toGlobalId({
          type: NODE_TYPES.Article,
          id: article.id,
        })
      )
    })
  })

  describe('reviewTopicChannelFeedback mutation', () => {
    const REVIEW_FEEDBACK = /* GraphQL */ `
      mutation ReviewTopicChannelFeedback(
        $input: ReviewTopicChannelFeedbackInput!
      ) {
        reviewTopicChannelFeedback(input: $input) {
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

    test('accepts feedback successfully', async () => {
      // Create a pending feedback first
      const feedback = await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
          articleId: article.id,
          userId: user.id,
          channelIds: JSON.stringify([
            channel1.id,
            channel2.id,
          ]) as unknown as string[],
        },
      })

      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { data, errors } = await server.executeOperation({
        query: REVIEW_FEEDBACK,
        variables: {
          input: {
            feedback: toGlobalId({
              type: NODE_TYPES.TopicChannelFeedback,
              id: feedback.id,
            }),
            action: 'accept',
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.reviewTopicChannelFeedback).toBeDefined()
      expect(data?.reviewTopicChannelFeedback.state).toBe(
        TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED
      )
    })

    test('rejects feedback successfully', async () => {
      // Create a pending feedback first
      const feedback = await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
          articleId: article.id,
          userId: user.id,
          channelIds: JSON.stringify([
            channel1.id,
            channel2.id,
          ]) as unknown as string[],
        },
      })

      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { data, errors } = await server.executeOperation({
        query: REVIEW_FEEDBACK,
        variables: {
          input: {
            feedback: toGlobalId({
              type: NODE_TYPES.TopicChannelFeedback,
              id: feedback.id,
            }),
            action: 'reject',
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.reviewTopicChannelFeedback).toBeDefined()
      expect(data?.reviewTopicChannelFeedback.state).toBe(
        TOPIC_CHANNEL_FEEDBACK_STATE.REJECTED
      )
    })

    test('returns error for invalid feedback id', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { errors } = await server.executeOperation({
        query: REVIEW_FEEDBACK,
        variables: {
          input: {
            feedback: toGlobalId({ type: NODE_TYPES.Article, id: '1' }),
            action: 'accept',
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
    })

    test('returns error for non-existent feedback', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { errors } = await server.executeOperation({
        query: REVIEW_FEEDBACK,
        variables: {
          input: {
            feedback: toGlobalId({
              type: NODE_TYPES.TopicChannelFeedback,
              id: '999999',
            }),
            action: 'accept',
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('ENTITY_NOT_FOUND')
    })

    test('returns error for non-admin user', async () => {
      // Create a pending feedback first
      const feedback = await atomService.create({
        table: 'topic_channel_feedback',
        data: {
          type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
          state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
          articleId: article.id,
          userId: user.id,
          channelIds: JSON.stringify([
            channel1.id,
            channel2.id,
          ]) as unknown as string[],
        },
      })

      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: false,
      })

      const { errors } = await server.executeOperation({
        query: REVIEW_FEEDBACK,
        variables: {
          input: {
            feedback: toGlobalId({
              type: NODE_TYPES.TopicChannelFeedback,
              id: feedback.id,
            }),
            action: 'accept',
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
    })
  })
})
