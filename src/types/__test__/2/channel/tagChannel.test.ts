import type { Connections } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { genConnections, closeConnections, testClient } from '../../utils.js'

let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('putTagChannel', () => {
  test('enable and set navbarTitle', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const PUT_TAG_CHANNEL = /* GraphQL */ `
      mutation PutTagChannel($input: PutTagChannelInput!) {
        putTagChannel(input: $input) {
          id
          navbarTitle(input: { language: en })
        }
      }
    `

    const { data, errors } = await server.executeOperation({
      query: PUT_TAG_CHANNEL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Tag, id: '2' }),
          enabled: true,
          navbarTitle: [{ language: 'en', text: 'Nav for tag' }],
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.putTagChannel?.id).toBeDefined()
    expect(data?.putTagChannel?.navbarTitle).toBe('Nav for tag')
  })
})

describe('Tag.channelEnabled', () => {
  test('returns false when no tag_channel record exists', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const GET_TAG_CHANNEL_ENABLED = /* GraphQL */ `
      query GetTag($input: NodeInput!) {
        node(input: $input) {
          ... on Tag {
            id
            channelEnabled
          }
        }
      }
    `

    const { data, errors } = await server.executeOperation({
      query: GET_TAG_CHANNEL_ENABLED,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Tag, id: '1' }),
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.node?.channelEnabled).toBe(false)
  })

  test('returns true when tag_channel is enabled', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // First enable the tag channel
    const PUT_TAG_CHANNEL = /* GraphQL */ `
      mutation PutTagChannel($input: PutTagChannelInput!) {
        putTagChannel(input: $input) {
          id
          channelEnabled
        }
      }
    `

    const { data: putData, errors: putErrors } = await server.executeOperation({
      query: PUT_TAG_CHANNEL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Tag, id: '3' }),
          enabled: true,
        },
      },
    })

    expect(putErrors).toBeUndefined()
    expect(putData?.putTagChannel?.channelEnabled).toBe(true)

    // Then query the tag to verify channelEnabled field
    const GET_TAG_CHANNEL_ENABLED = /* GraphQL */ `
      query GetTag($input: NodeInput!) {
        node(input: $input) {
          ... on Tag {
            id
            channelEnabled
          }
        }
      }
    `

    const { data, errors } = await server.executeOperation({
      query: GET_TAG_CHANNEL_ENABLED,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Tag, id: '3' }),
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.node?.channelEnabled).toBe(true)
  })

  test('returns false when tag_channel is disabled', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // First disable the tag channel
    const PUT_TAG_CHANNEL = /* GraphQL */ `
      mutation PutTagChannel($input: PutTagChannelInput!) {
        putTagChannel(input: $input) {
          id
          channelEnabled
        }
      }
    `

    const { data: putData, errors: putErrors } = await server.executeOperation({
      query: PUT_TAG_CHANNEL,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Tag, id: '4' }),
          enabled: false,
        },
      },
    })

    expect(putErrors).toBeUndefined()
    expect(putData?.putTagChannel?.channelEnabled).toBe(false)

    // Then query the tag to verify channelEnabled field
    const GET_TAG_CHANNEL_ENABLED = /* GraphQL */ `
      query GetTag($input: NodeInput!) {
        node(input: $input) {
          ... on Tag {
            id
            channelEnabled
          }
        }
      }
    `

    const { data, errors } = await server.executeOperation({
      query: GET_TAG_CHANNEL_ENABLED,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Tag, id: '4' }),
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.node?.channelEnabled).toBe(false)
  })
})
