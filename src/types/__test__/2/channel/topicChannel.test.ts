import type { Connections } from '#definitions/index.js'

import { NODE_TYPES, LANGUAGE } from '#common/enums/index.js'
import { AtomService, ChannelService } from '#connectors/index.js'
import { toGlobalId, fromGlobalId } from '#common/utils/index.js'

import { genConnections, closeConnections, testClient } from '../../utils.js'

let connections: Connections
let atomService: AtomService
let channelService: ChannelService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  channelService = new ChannelService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('manage topic channels', () => {
  const PUT_TOPIC_CHANNEL = /* GraphQL */ `
    mutation ($input: PutTopicChannelInput!) {
      putTopicChannel(input: $input) {
        id
        shortHash
        nameEn: name(input: { language: en })
        nameZhHant: name(input: { language: zh_hant })
        nameZhHans: name(input: { language: zh_hans })
        noteEn: note(input: { language: en })
        noteZhHant: note(input: { language: zh_hant })
        noteZhHans: note(input: { language: zh_hans })
        enabled
      }
    }
  `

  const SET_ARTICLE_CHANNELS = /* GraphQL */ `
    mutation ($input: SetArticleTopicChannelsInput!) {
      setArticleTopicChannels(input: $input) {
        id
        oss {
          topicChannels {
            channel {
              id
              providerId
              enabled
            }
            enabled
            isLabeled
            score
          }
        }
      }
    }
  `

  const QUERY_CHANNEL = /* GraphQL */ `
    query ($input: ChannelInput!) {
      channel(input: $input) {
        id
      }
    }
  `

  const QUERY_CHANNEL_BY_ADMIN = /* GraphQL */ `
    query ($input: ChannelInput!) {
      channel(input: $input) {
        id
        ... on TopicChannel {
          enabled
        }
      }
    }
  `
  const QUERY_CHANNELS = /* GraphQL */ `
    query {
      channels {
        id
        ... on TopicChannel {
          name
        }
      }
    }
  `

  const QUERY_CHANNELS_BY_ADMIN = /* GraphQL */ `
    query {
      channels(input: { oss: true }) {
        id
        ... on TopicChannel {
          providerId
          name
          note
          enabled
        }
      }
    }
  `

  beforeAll(async () => {
    await channelService.createTopicChannel({
      name: 'test',
      providerId: 'test-provider-1',
      note: 'test',
      enabled: true,
    })
  })

  test('create channel with providerId', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const providerId = 'test-provider-' + Date.now()
    const name = Object.keys(LANGUAGE).map((lang) => ({
      text: 'new channel ' + lang,
      language: lang,
    }))
    const note = Object.keys(LANGUAGE).map((lang) => ({
      text: 'new description ' + lang,
      language: lang,
    }))

    const { data, errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          providerId,
          name,
          note,
          enabled: true,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putTopicChannel.nameEn).toBe('new channel en')
    expect(data.putTopicChannel.nameZhHans).toBe('new channel zh_hans')
    expect(data.putTopicChannel.nameZhHant).toBe('new channel zh_hant')
    expect(data.putTopicChannel.noteEn).toBe('new description en')
    expect(data.putTopicChannel.noteZhHans).toBe('new description zh_hans')
    expect(data.putTopicChannel.noteZhHant).toBe('new description zh_hant')
    expect(data.putTopicChannel.enabled).toBe(true)

    // Verify channel was created with correct providerId
    const createdChannel = await atomService.findUnique({
      table: 'topic_channel',
      where: { id: fromGlobalId(data.putTopicChannel.id).id },
    })
    expect(createdChannel.providerId).toBe(providerId)
  })

  test('requires providerId for new channel', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          name: [{ text: 'test', language: 'en' }],
          enabled: true,
        },
      },
    })

    expect(errors[0].message).toBe(
      'Provider ID is required for creating topic channel'
    )
  })

  test('validates channel type when updating', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: '1' }), // Wrong type
          name: [{ text: 'test', language: 'en' }],
        },
      },
    })

    expect(errors[0].message).toBe('Wrong channel global ID')
  })

  test('handles partial updates', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // First create a channel
    const { data: createData } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          providerId: 'test-provider-' + Date.now(),
          name: [{ text: 'Initial Name', language: 'en' }],
          note: [{ text: 'Initial Note', language: 'en' }],
          enabled: true,
        },
      },
    })

    // Then update only some fields
    const { data: updateData, errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          id: createData.putTopicChannel.id,
          enabled: false,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(updateData.putTopicChannel.nameEn).toBe('Initial Name')
    expect(updateData.putTopicChannel.noteEn).toBe('Initial Note')
    expect(updateData.putTopicChannel.enabled).toBe(false)
  })

  test('update channel successfully', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const channel = await atomService.findFirst({
      table: 'topic_channel',
      where: {},
    })

    const newName = Object.keys(LANGUAGE).map((lang) => ({
      text: 'updated channel ' + lang,
      language: lang,
    }))
    const newDescription = Object.keys(LANGUAGE).map((lang) => ({
      text: 'updated description ' + lang,
      language: lang,
    }))

    const { data, errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.TopicChannel, id: channel.id }),
          name: newName,
          note: newDescription,
          enabled: false,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putTopicChannel.nameEn).toBe('updated channel en')
    expect(data.putTopicChannel.noteEn).toBe('updated description en')
    expect(data.putTopicChannel.noteZhHans).toBe('updated description zh_hans')
    expect(data.putTopicChannel.noteZhHant).toBe('updated description zh_hant')
    expect(data.putTopicChannel.enabled).toBe(false)
  })

  test('set article channels', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const channel = await atomService.findFirst({
      table: 'topic_channel',
      where: {},
    })
    const article = await atomService.findFirst({
      table: 'article',
      where: { id: '1' },
    })
    const channelGlobalId = toGlobalId({
      type: NODE_TYPES.TopicChannel,
      id: channel.id,
    })

    const { data, errors } = await server.executeOperation({
      query: SET_ARTICLE_CHANNELS,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: article.id }),
          channels: [channelGlobalId],
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.setArticleTopicChannels.oss.topicChannels.length).toBe(1)
    expect(data.setArticleTopicChannels.oss.topicChannels[0].channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: channel.id })
    )
    expect(
      data.setArticleTopicChannels.oss.topicChannels[0].channel.enabled
    ).toBe(channel.enabled)
    expect(
      data.setArticleTopicChannels.oss.topicChannels[0].channel.providerId
    ).toBe(channel.providerId)
    expect(data.setArticleTopicChannels.oss.topicChannels[0].enabled).toBe(true)
    expect(data.setArticleTopicChannels.oss.topicChannels[0].isLabeled).toBe(
      true
    )
    expect(data.setArticleTopicChannels.oss.topicChannels[0].score).toBeNull()
  })

  test('query channel', async () => {
    const adminServer = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })
    const normalServer = await testClient({
      connections,
      isAuth: true,
    })

    const channel = await channelService.createTopicChannel({
      name: 'test',
      providerId: 'test-provider-2',
      note: 'test',
      enabled: false,
    })
    const channelGlobalId = toGlobalId({
      type: NODE_TYPES.TopicChannel,
      id: channel.id,
    })

    // Query by admin user
    const { data: adminQueryData, errors: adminErrors } =
      await adminServer.executeOperation({
        query: QUERY_CHANNEL_BY_ADMIN,
        variables: {
          input: { shortHash: channel.shortHash },
        },
      })
    expect(adminErrors).toBeUndefined()
    expect(adminQueryData.channel.id).toBe(channelGlobalId)
    expect(adminQueryData.channel.enabled).toBe(false)

    // Query by normal user
    const { data: normalUserData } = await normalServer.executeOperation({
      query: QUERY_CHANNEL,
      variables: {
        input: { shortHash: channel.shortHash },
      },
    })
    expect(normalUserData.channel).toBeNull()
  })

  test('query channels', async () => {
    const adminServer = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })
    const normalServer = await testClient({
      connections,
      isAuth: true,
    })

    // add channel
    await channelService.createTopicChannel({
      name: 'test',
      providerId: 'test-provider-3',
      note: 'test',
      enabled: true,
    })

    const channels = await atomService.findMany({
      table: 'topic_channel',
      where: {},
    })
    expect(channels.length).toBe(5)

    const { data, errors } = await adminServer.executeOperation({
      query: QUERY_CHANNELS_BY_ADMIN,
    })
    expect(errors).toBeUndefined()
    expect(data.channels).toBeDefined()
    expect(data.channels.length).toBe(5)

    // disable channel

    const globalId = toGlobalId({
      type: NODE_TYPES.TopicChannel,
      id: channels[0].id,
    })
    await adminServer.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          id: globalId,
          enabled: false,
        },
      },
    })

    const { data: data2, errors: errors2 } = await adminServer.executeOperation(
      {
        query: QUERY_CHANNELS_BY_ADMIN,
      }
    )
    expect(errors2).toBeUndefined()
    expect(data2.channels.length).toBe(5)

    for (const channel of data2.channels) {
      if (channel.id === globalId) {
        expect(channel.enabled).toBe(false)
      }
    }

    // query by normal user
    const { data: data3, errors: errors3 } =
      await normalServer.executeOperation({
        query: QUERY_CHANNELS,
      })
    expect(errors3).toBeUndefined()
    expect(data3.channels.length).toBe(1)
  })

  test('non-auth users cannot manage channels', async () => {
    const server = await testClient({ connections })

    const { errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.TopicChannel, id: '1' }),
          name: [{ text: 'test', language: 'en' }],
        },
      },
    })

    expect(errors[0].extensions.code).toBe('FORBIDDEN')
  })
})
