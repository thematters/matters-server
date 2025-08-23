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
        }
      }
    `

    const { data, errors } = await server.executeOperation({
      query: PUT_TAG_CHANNEL,
      variables: {
        input: {
          tag: toGlobalId({ type: NODE_TYPES.Tag, id: '2' }),
          enabled: true,
          navbarTitle: [{ language: 'en', text: 'Nav for tag' }],
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.putTagChannel?.id).toBeDefined()
  })
})
