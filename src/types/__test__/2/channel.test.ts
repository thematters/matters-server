import type { Connections, User } from '#definitions/index.js'

import {
  NODE_TYPES,
  LANGUAGE,
  CURATION_CHANNEL_COLOR,
  CURATION_CHANNEL_STATE,
} from '#common/enums/index.js'
import { AtomService, ChannelService } from '#connectors/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { genConnections, closeConnections, testClient } from '../utils.js'

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
      channels {
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

  let admin: User
  let normalUser: User

  beforeAll(async () => {
    admin = await atomService.findFirst({
      table: 'user',
      where: { role: 'admin' },
    })
    normalUser = await atomService.findFirst({
      table: 'user',
      where: { role: 'user' },
    })
    await channelService.updateOrCreateChannel({
      name: 'test',
      providerId: 'test-provider-1',
      note: 'test',
      enabled: true,
    })
  })

  test('update channel successfully', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })

    const channel = await atomService.findFirst({
      table: 'channel',
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
      context: { viewer: admin },
    })

    const channel = await atomService.findFirst({
      table: 'channel',
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
      context: { viewer: admin },
    })
    const normalServer = await testClient({
      connections,
      isAuth: true,
      context: { viewer: normalUser },
    })

    const channel = await channelService.updateOrCreateChannel({
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
      context: { viewer: admin },
    })
    const normalServer = await testClient({
      connections,
      isAuth: true,
      context: { viewer: normalUser },
    })

    // add channel
    await channelService.updateOrCreateChannel({
      name: 'test',
      providerId: 'test-provider-3',
      note: 'test',
      enabled: true,
    })

    const { data, errors } = await adminServer.executeOperation({
      query: QUERY_CHANNELS_BY_ADMIN,
    })
    expect(errors).toBeUndefined()
    expect(data.channels).toBeDefined()
    expect(data.channels.length).toBe(3)

    // disable channel
    await adminServer.executeOperation({
      query: PUT_TOPIC_CHANNEL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Channel, id: '1' }),
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
    expect(data2.channels.length).toBe(3)
    expect(data2.channels[0].enabled).toBe(false)

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

describe('manage curation channels', () => {
  const PUT_CURATION_CHANNEL = /* GraphQL */ `
    mutation ($input: PutCurationChannelInput!) {
      putCurationChannel(input: $input) {
        id
        shortHash
        nameEn: name(input: { language: en })
        nameZhHant: name(input: { language: zh_hant })
        noteEn: note(input: { language: en })
        noteZhHant: note(input: { language: zh_hant })
        pinAmount
        color
        activePeriod {
          start
          end
        }
        state
      }
    }
  `

  let admin: User
  let normalUser: User

  beforeAll(async () => {
    admin = await atomService.findFirst({
      table: 'user',
      where: { role: 'admin' },
    })
    normalUser = await atomService.findFirst({
      table: 'user',
      where: { role: 'user' },
    })
  })

  test('non-admin users cannot create/update curation channels', async () => {
    const nonAuthServer = await testClient({ connections })

    const { errors } = await nonAuthServer.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [{ text: 'test', language: 'en' }],
        },
      },
    })
    expect(errors[0].extensions.code).toBe('FORBIDDEN')

    const nonAdminServer = await testClient({
      connections,
      isAuth: true,
      context: { viewer: normalUser },
    })

    const { errors: nonAdminErrors } = await nonAdminServer.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [{ text: 'test', language: 'en' }],
        },
      },
    })

    expect(nonAdminErrors[0].extensions.code).toBe('FORBIDDEN')
  })

  test('create new curation channel successfully', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7) // 7 days from now

    const { data, errors } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [
            { text: 'Test Channel', language: 'en' },
            { text: '測試頻道', language: 'zh_hant' },
          ],
          note: [
            { text: 'Test Note', language: 'en' },
            { text: '測試備註', language: 'zh_hant' },
          ],
          pinAmount: 5,
          color: CURATION_CHANNEL_COLOR.pink,
          activePeriod: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          state: CURATION_CHANNEL_STATE.published,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putCurationChannel.nameEn).toBe('Test Channel')
    expect(data.putCurationChannel.nameZhHant).toBe('測試頻道')
    expect(data.putCurationChannel.noteEn).toBe('Test Note')
    expect(data.putCurationChannel.noteZhHant).toBe('測試備註')
    expect(data.putCurationChannel.pinAmount).toBe(5)
    expect(data.putCurationChannel.color).toBe(CURATION_CHANNEL_COLOR.pink)
    expect(data.putCurationChannel.state).toBe(CURATION_CHANNEL_STATE.published)
    expect(new Date(data.putCurationChannel.activePeriod.start)).toBeInstanceOf(
      Date
    )
    expect(new Date(data.putCurationChannel.activePeriod.end)).toBeInstanceOf(
      Date
    )
  })

  test('update existing curation channel', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })

    // First create a channel
    const { data: createData, errors: createErrors } =
      await server.executeOperation({
        query: PUT_CURATION_CHANNEL,
        variables: {
          input: {
            name: [{ text: 'Initial Name', language: 'en' }],
            state: CURATION_CHANNEL_STATE.editing,
          },
        },
      })
    expect(createErrors).toBeUndefined()

    // Then update it
    const { data: updateData, errors: updateErrors } =
      await server.executeOperation({
        query: PUT_CURATION_CHANNEL,
        variables: {
          input: {
            id: createData.putCurationChannel.id,
            name: [{ text: 'Updated Name', language: 'en' }],
            pinAmount: 10,
            color: CURATION_CHANNEL_COLOR.red,
            state: CURATION_CHANNEL_STATE.published,
          },
        },
      })

    expect(updateErrors).toBeUndefined()
    expect(updateData.putCurationChannel.nameEn).toBe('Updated Name')
    expect(updateData.putCurationChannel.pinAmount).toBe(10)
    expect(updateData.putCurationChannel.color).toBe(CURATION_CHANNEL_COLOR.red)
    expect(updateData.putCurationChannel.state).toBe(
      CURATION_CHANNEL_STATE.published
    )
  })

  test('validates datetime range', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 7) // start date after end date

    const { errors } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [{ text: 'Test Channel', language: 'en' }],
          activePeriod: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        },
      },
    })

    expect(errors[0].message).toBe('invalid datetime range')
  })

  test('handles partial updates', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })

    // Create initial channel
    const { data: createData } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          name: [{ text: 'Initial Name', language: 'en' }],
          note: [{ text: 'Initial Note', language: 'en' }],
          pinAmount: 5,
          color: CURATION_CHANNEL_COLOR.pink,
          state: CURATION_CHANNEL_STATE.editing,
        },
      },
    })

    // Update only some fields
    const { data: updateData, errors } = await server.executeOperation({
      query: PUT_CURATION_CHANNEL,
      variables: {
        input: {
          id: createData.putCurationChannel.id,
          pinAmount: 15,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(updateData.putCurationChannel.nameEn).toBe('Initial Name')
    expect(updateData.putCurationChannel.noteEn).toBe('Initial Note')
    expect(updateData.putCurationChannel.pinAmount).toBe(15)
    expect(updateData.putCurationChannel.color).toBe(
      CURATION_CHANNEL_COLOR.pink
    )
    expect(updateData.putCurationChannel.state).toBe(
      CURATION_CHANNEL_STATE.editing
    )
  })
})
