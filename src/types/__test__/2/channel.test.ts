import type { Connections, User } from 'definitions'

import { NODE_TYPES, LANGUAGE } from 'common/enums'
import { AtomService } from 'connectors'
import { toGlobalId } from 'common/utils'

import { genConnections, closeConnections, testClient } from '../utils'

let connections: Connections
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('manage channels', () => {
  const PUT_CHANNEL = /* GraphQL */ `
    mutation ($input: PutChannelInput!) {
      putChannel(input: $input) {
        id
        shortHash
        providerId
        nameEn: name(input: { language: en })
        nameZhHant: name(input: { language: zh_hant })
        nameZhHans: name(input: { language: zh_hans })
        descriptionEn: description(input: { language: en })
        descriptionZhHant: description(input: { language: zh_hant })
        descriptionZhHans: description(input: { language: zh_hans })
        enabled
      }
    }
  `

  const SET_ARTICLE_CHANNELS = /* GraphQL */ `
    mutation ($input: SetArticleChannelsInput!) {
      setArticleChannels(input: $input) {
        id
        oss {
          channels {
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

  const QUERY_CHANNELS = /* GraphQL */ `
    query {
      channels {
        id
        name
      }
    }
  `

  const QUERY_CHANNELS_BY_ADMIN = /* GraphQL */ `
    query {
      channels {
        id
        providerId
        name
        description
        enabled
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

  test('create channel successfully', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })

    const name = Object.keys(LANGUAGE).map((lang) => ({
      text: 'test channel ' + lang,
      language: lang,
    }))
    const description = Object.keys(LANGUAGE).map((lang) => ({
      text: 'test description ' + lang,
      language: lang,
    }))

    const { data, errors } = await server.executeOperation({
      query: PUT_CHANNEL,
      variables: {
        input: {
          providerId: 'test-provider',
          name,
          description,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putChannel.shortHash).toBeDefined()
    expect(data.putChannel.providerId).toBe('test-provider')
    expect(data.putChannel.nameEn).toBe('test channel en')
    expect(data.putChannel.nameZhHans).toBe('test channel zh_hans')
    expect(data.putChannel.descriptionEn).toBe('test description en')
    expect(data.putChannel.descriptionZhHans).toBe('test description zh_hans')
    expect(data.putChannel.descriptionZhHant).toBe('test description zh_hant')
    expect(data.putChannel.enabled).toBe(true)

    const channel = await atomService.findFirst({
      table: 'channel',
      where: { providerId: 'test-provider' },
    })
    expect(channel).toBeDefined()
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
      query: PUT_CHANNEL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Channel, id: channel.id }),
          providerId: 'test-provider-updated',
          name: newName,
          description: newDescription,
          enabled: false,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.putChannel.providerId).toBe('test-provider-updated')
    expect(data.putChannel.nameEn).toBe('updated channel en')
    expect(data.putChannel.descriptionEn).toBe('updated description en')
    expect(data.putChannel.descriptionZhHans).toBe(
      'updated description zh_hans'
    )
    expect(data.putChannel.descriptionZhHant).toBe(
      'updated description zh_hant'
    )
    expect(data.putChannel.enabled).toBe(false)
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
      type: NODE_TYPES.Channel,
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
    expect(data.setArticleChannels.oss.channels.length).toBe(1)
    expect(data.setArticleChannels.oss.channels[0].channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.Channel, id: channel.id })
    )
    expect(data.setArticleChannels.oss.channels[0].channel.enabled).toBe(
      channel.enabled
    )
    expect(data.setArticleChannels.oss.channels[0].channel.providerId).toBe(
      channel.providerId
    )
    expect(data.setArticleChannels.oss.channels[0].enabled).toBe(true)
    expect(data.setArticleChannels.oss.channels[0].isLabeled).toBe(true)
    expect(data.setArticleChannels.oss.channels[0].score).toBeNull()
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
    await adminServer.executeOperation({
      query: PUT_CHANNEL,
      variables: {
        input: {
          providerId: 'test-provider-2',
          name: [{ text: 'test', language: 'en' }],
        },
      },
    })
    const { data, errors } = await adminServer.executeOperation({
      query: QUERY_CHANNELS_BY_ADMIN,
    })
    expect(errors).toBeUndefined()
    expect(data.channels).toBeDefined()
    expect(data.channels.length).toBe(2)

    // disable channel
    await adminServer.executeOperation({
      query: PUT_CHANNEL,
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
    expect(data2.channels.length).toBe(2)
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
      query: PUT_CHANNEL,
      variables: {
        input: {
          providerId: 'test',
          name: [{ text: 'test', language: 'en' }],
        },
      },
    })

    expect(errors[0].extensions.code).toBe('FORBIDDEN')
  })
})
