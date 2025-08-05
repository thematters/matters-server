import type { Connections } from '#definitions/index.js'

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

beforeEach(async () => {
  // Clean up previous test data
  await atomService.deleteMany({ table: 'topic_channel' })
})

describe('TopicChannel parent field', () => {
  const QUERY_TOPIC_CHANNEL_WITH_PARENT = /* GraphQL */ `
    query TopicChannelWithParent($input: ChannelInput!) {
      channel(input: $input) {
        ... on TopicChannel {
          id
          shortHash
          name
          parent {
            id
            shortHash
            name
          }
        }
      }
    }
  `

  test('returns null when channel has no parent', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create test channel without parent
    const channel = await channelService.createTopicChannel({
      name: 'test-topic-no-parent',
      providerId: 'test-provider-1',
      enabled: true,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_TOPIC_CHANNEL_WITH_PARENT,
      variables: {
        input: { shortHash: channel.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: channel.id })
    )
    expect(data.channel.shortHash).toBe(channel.shortHash)
    expect(data.channel.name).toBe('test-topic-no-parent')
    expect(data.channel.parent).toBeNull()
  })

  test('returns parent channel when channel has parent', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create parent channel
    const parentChannel = await channelService.createTopicChannel({
      name: 'parent-topic',
      providerId: 'parent-provider',
      enabled: true,
    })

    // Create child channel with parent
    const childChannel = await channelService.createTopicChannel({
      name: 'child-topic',
      providerId: 'child-provider',
      enabled: true,
    })

    // Set parent relationship
    await atomService.update({
      table: 'topic_channel',
      where: { id: childChannel.id },
      data: { parentId: parentChannel.id },
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_TOPIC_CHANNEL_WITH_PARENT,
      variables: {
        input: { shortHash: childChannel.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: childChannel.id })
    )
    expect(data.channel.shortHash).toBe(childChannel.shortHash)
    expect(data.channel.name).toBe('child-topic')
    expect(data.channel.parent).toBeDefined()
    expect(data.channel.parent.id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: parentChannel.id })
    )
    expect(data.channel.parent.shortHash).toBe(parentChannel.shortHash)
    expect(data.channel.parent.name).toBe('parent-topic')
  })

  test('works for unauthenticated users', async () => {
    const server = await testClient({
      connections,
      isAuth: false,
    })

    // Create parent channel
    const parentChannel = await channelService.createTopicChannel({
      name: 'parent-topic-unauthenticated',
      providerId: 'parent-provider-unauth',
      enabled: true,
    })

    // Create child channel with parent
    const childChannel = await channelService.createTopicChannel({
      name: 'child-topic-unauthenticated',
      providerId: 'child-provider-unauth',
      enabled: true,
    })

    // Set parent relationship
    await atomService.update({
      table: 'topic_channel',
      where: { id: childChannel.id },
      data: { parentId: parentChannel.id },
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_TOPIC_CHANNEL_WITH_PARENT,
      variables: {
        input: { shortHash: childChannel.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: childChannel.id })
    )
    expect(data.channel.shortHash).toBe(childChannel.shortHash)
    expect(data.channel.name).toBe('child-topic-unauthenticated')
    expect(data.channel.parent).toBeDefined()
    expect(data.channel.parent.id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: parentChannel.id })
    )
    expect(data.channel.parent.shortHash).toBe(parentChannel.shortHash)
    expect(data.channel.parent.name).toBe('parent-topic-unauthenticated')
  })

  test('handles nested parent relationships', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create grandparent channel
    const grandparentChannel = await channelService.createTopicChannel({
      name: 'grandparent-topic',
      providerId: 'grandparent-provider',
      enabled: true,
    })

    // Create parent channel with grandparent
    const parentChannel = await channelService.createTopicChannel({
      name: 'parent-topic-nested',
      providerId: 'parent-provider-nested',
      enabled: true,
    })

    // Set grandparent relationship
    await atomService.update({
      table: 'topic_channel',
      where: { id: parentChannel.id },
      data: { parentId: grandparentChannel.id },
    })

    // Create child channel with parent
    const childChannel = await channelService.createTopicChannel({
      name: 'child-topic-nested',
      providerId: 'child-provider-nested',
      enabled: true,
    })

    // Set parent relationship
    await atomService.update({
      table: 'topic_channel',
      where: { id: childChannel.id },
      data: { parentId: parentChannel.id },
    })

    // Query child channel
    const { data: childData, errors: childErrors } =
      await server.executeOperation({
        query: QUERY_TOPIC_CHANNEL_WITH_PARENT,
        variables: {
          input: { shortHash: childChannel.shortHash },
        },
      })

    expect(childErrors).toBeUndefined()
    expect(childData.channel.parent.id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: parentChannel.id })
    )
    expect(childData.channel.parent.name).toBe('parent-topic-nested')

    // Query parent channel
    const { data: parentData, errors: parentErrors } =
      await server.executeOperation({
        query: QUERY_TOPIC_CHANNEL_WITH_PARENT,
        variables: {
          input: { shortHash: parentChannel.shortHash },
        },
      })

    expect(parentErrors).toBeUndefined()
    expect(parentData.channel.parent.id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: grandparentChannel.id })
    )
    expect(parentData.channel.parent.name).toBe('grandparent-topic')

    // Query grandparent channel
    const { data: grandparentData, errors: grandparentErrors } =
      await server.executeOperation({
        query: QUERY_TOPIC_CHANNEL_WITH_PARENT,
        variables: {
          input: { shortHash: grandparentChannel.shortHash },
        },
      })

    expect(grandparentErrors).toBeUndefined()
    expect(grandparentData.channel.parent).toBeNull()
  })
})
