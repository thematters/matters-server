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
        navbarTitleEn: navbarTitle(input: { language: en })
        navbarTitleZhHant: navbarTitle(input: { language: zh_hant })
        navbarTitleZhHans: navbarTitle(input: { language: zh_hans })
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
            classicfiedAt
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

  test('create channel with sub-channels', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // First create sub-channels
    const subChannel1 = await channelService.createTopicChannel({
      name: 'sub-channel-1',
      providerId: 'sub-provider-1',
      enabled: true,
    })
    const subChannel2 = await channelService.createTopicChannel({
      name: 'sub-channel-2',
      providerId: 'sub-provider-2',
      enabled: true,
    })

    const providerId = 'test-provider-parent-' + Date.now()
    const name = [{ text: 'Parent Channel', language: 'en' }]
    const subChannels = [
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: subChannel1.id }),
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: subChannel2.id }),
    ]

    const { data, errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          providerId,
          name,
          enabled: true,
          subChannels,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putTopicChannel.nameEn).toBe('Parent Channel')

    // Verify sub-channels have correct parent
    const updatedSubChannel1 = await atomService.findUnique({
      table: 'topic_channel',
      where: { id: subChannel1.id },
    })
    const updatedSubChannel2 = await atomService.findUnique({
      table: 'topic_channel',
      where: { id: subChannel2.id },
    })

    const parentChannelId = fromGlobalId(data.putTopicChannel.id).id
    expect(updatedSubChannel1.parentId).toBe(parentChannelId)
    expect(updatedSubChannel2.parentId).toBe(parentChannelId)
  })

  test('update channel with sub-channels', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create parent and sub-channels
    const parentChannel = await channelService.createTopicChannel({
      name: 'parent-channel',
      enabled: true,
    })

    const subChannel1 = await channelService.createTopicChannel({
      name: 'sub-channel-1',
      enabled: true,
    })
    const subChannel2 = await channelService.createTopicChannel({
      name: 'sub-channel-2',
      enabled: true,
    })
    const subChannel3 = await channelService.createTopicChannel({
      name: 'sub-channel-3',
      enabled: true,
    })

    // First set sub-channels
    await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          id: toGlobalId({
            type: NODE_TYPES.TopicChannel,
            id: parentChannel.id,
          }),
          subChannels: [
            toGlobalId({ type: NODE_TYPES.TopicChannel, id: subChannel1.id }),
            toGlobalId({ type: NODE_TYPES.TopicChannel, id: subChannel2.id }),
          ],
        },
      },
    })

    // Verify initial sub-channels
    let updatedSubChannel1 = await atomService.findUnique({
      table: 'topic_channel',
      where: { id: subChannel1.id },
    })
    let updatedSubChannel2 = await atomService.findUnique({
      table: 'topic_channel',
      where: { id: subChannel2.id },
    })
    let updatedSubChannel3 = await atomService.findUnique({
      table: 'topic_channel',
      where: { id: subChannel3.id },
    })

    expect(updatedSubChannel1.parentId).toBe(parentChannel.id)
    expect(updatedSubChannel2.parentId).toBe(parentChannel.id)
    expect(updatedSubChannel3.parentId).toBeNull()

    // Update sub-channels (remove subChannel1, keep subChannel2, add subChannel3)
    const { errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          id: toGlobalId({
            type: NODE_TYPES.TopicChannel,
            id: parentChannel.id,
          }),
          subChannels: [
            toGlobalId({ type: NODE_TYPES.TopicChannel, id: subChannel2.id }),
            toGlobalId({ type: NODE_TYPES.TopicChannel, id: subChannel3.id }),
          ],
        },
      },
    })

    expect(errors).toBeUndefined()

    // Verify updated sub-channels
    updatedSubChannel1 = await atomService.findUnique({
      table: 'topic_channel',
      where: { id: subChannel1.id },
    })
    updatedSubChannel2 = await atomService.findUnique({
      table: 'topic_channel',
      where: { id: subChannel2.id },
    })
    updatedSubChannel3 = await atomService.findUnique({
      table: 'topic_channel',
      where: { id: subChannel3.id },
    })

    expect(updatedSubChannel1.parentId).toBeNull() // Removed from parent
    expect(updatedSubChannel2.parentId).toBe(parentChannel.id) // Still child
    expect(updatedSubChannel3.parentId).toBe(parentChannel.id) // Added as child
  })

  test('create channel without sub-channels', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const providerId = 'test-provider-no-subs-' + Date.now()
    const name = [{ text: 'Channel Without Subs', language: 'en' }]

    const { data, errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          providerId,
          name,
          enabled: true,
          // No subChannels provided
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putTopicChannel.nameEn).toBe('Channel Without Subs')

    // Should work fine without sub-channels
    const createdChannel = await atomService.findUnique({
      table: 'topic_channel',
      where: { id: fromGlobalId(data.putTopicChannel.id).id },
    })
    expect(createdChannel.providerId).toBe(providerId)
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
    expect(
      data.setArticleTopicChannels.oss.topicChannels[0].classicfiedAt
    ).toBeDefined()

    // Verify classicfiedAt matches createdAt
    const articleChannel = await atomService.findFirst({
      table: 'topic_channel_article',
      where: {
        articleId: article.id,
        channelId: channel.id,
      },
    })
    expect(
      new Date(
        data.setArticleTopicChannels.oss.topicChannels[0].classicfiedAt
      ).getTime()
    ).toBe(articleChannel.createdAt.getTime())
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

    const { data, errors } = await adminServer.executeOperation({
      query: QUERY_CHANNELS_BY_ADMIN,
    })
    expect(errors).toBeUndefined()
    expect(data.channels).toBeDefined()
    expect(data.channels.length).toBe(channels.length)

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
    expect(data2.channels.length).toBe(channels.length)

    for (const channel of data2.channels) {
      if (channel.id === globalId) {
        expect(channel.enabled).toBe(false)
      }
    }

    const enabledChannels = await atomService.findMany({
      table: 'topic_channel',
      where: { enabled: true },
    })
    // query by normal user
    const { data: data3, errors: errors3 } =
      await normalServer.executeOperation({
        query: QUERY_CHANNELS,
      })
    expect(errors3).toBeUndefined()
    expect(data3.channels.length).toBe(enabledChannels.length)
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

  test('create channel with navbarTitle', async () => {
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
    const navbarTitle = Object.keys(LANGUAGE).map((lang) => ({
      text: 'navbar title ' + lang,
      language: lang,
    }))

    const { data, errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          providerId,
          name,
          navbarTitle,
          enabled: true,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putTopicChannel.navbarTitleEn).toBe('navbar title en')
    expect(data.putTopicChannel.navbarTitleZhHans).toBe('navbar title zh_hans')
    expect(data.putTopicChannel.navbarTitleZhHant).toBe('navbar title zh_hant')
  })

  test('update navbarTitle', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // First create a channel
    const providerId = 'test-provider-' + Date.now()
    const { data: createData } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          providerId,
          name: [{ text: 'test channel', language: 'en' }],
          enabled: true,
        },
      },
    })

    // Update navbarTitle
    const newNavbarTitle = Object.keys(LANGUAGE).map((lang) => ({
      text: 'updated navbar title ' + lang,
      language: lang,
    }))

    const { data: updateData, errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          id: createData.putTopicChannel.id,
          navbarTitle: newNavbarTitle,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(updateData.putTopicChannel.navbarTitleEn).toBe(
      'updated navbar title en'
    )
    expect(updateData.putTopicChannel.navbarTitleZhHans).toBe(
      'updated navbar title zh_hans'
    )
    expect(updateData.putTopicChannel.navbarTitleZhHant).toBe(
      'updated navbar title zh_hant'
    )
  })

  test('navbarTitle fallback to name when not provided', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const providerId = 'test-provider-' + Date.now()
    const name = Object.keys(LANGUAGE).map((lang) => ({
      text: 'fallback name ' + lang,
      language: lang,
    }))

    const { data, errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          providerId,
          name,
          enabled: true,
        },
      },
    })
    expect(errors).toBeUndefined()
    // When navbarTitle is not provided, it should fallback to name
    expect(data.putTopicChannel.navbarTitleEn).toBe('fallback name en')
    expect(data.putTopicChannel.navbarTitleZhHans).toBe('fallback name zh_hans')
    expect(data.putTopicChannel.navbarTitleZhHant).toBe('fallback name zh_hant')
  })

  test('navbarTitle validation - too long', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          providerId: 'test-provider-' + Date.now(),
          name: [{ text: 'test', language: 'en' }],
          navbarTitle: [{ text: 'a'.repeat(33), language: 'en' }], // 33 characters, exceeds 32 limit
          enabled: true,
        },
      },
    })

    expect(errors[0].message).toBe('Navbar title is too long')
  })
})
