import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import { testClient } from './utils'

const GET_VIEWER_COLLECTIONS = /* GraphQL */ `
  query {
    viewer {
      collections(input: { first: null }) {
        totalCount
        edges {
          node {
            id
            title
            description
            cover
          }
        }
      }
    }
  }
`
const PUT_COLLECTIONS = /* GraphQL */ `
  mutation ($input: PutCollectionInput!) {
    putCollection(input: $input) {
      id
      title
      description
      cover
    }
  }
`

const DEL_COLLECTIONS = /* GraphQL */ `
  mutation ($input: DeleteCollectionsInput!) {
    deleteCollections(input: $input)
  }
`

describe('get viewer collections', () => {
  test('not logged in user', async () => {
    const server = await testClient()
    const { data, errors } = await server.executeOperation({
      query: GET_VIEWER_COLLECTIONS,
    })
    expect(data?.viewer?.collections?.totalCount).toBe(0)
    expect(errors).toBeUndefined()
  })

  test('logged in user', async () => {
    const server = await testClient({ isAuth: true })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_COLLECTIONS,
    })
    expect(data?.viewer?.collections?.totalCount).toBe(0)

    // create a collection
    const title = 'test title'
    await server.executeOperation({
      query: PUT_COLLECTIONS,
      variables: { input: { title } },
    })

    const { data: data1 } = await server.executeOperation({
      query: GET_VIEWER_COLLECTIONS,
    })
    expect(data1?.viewer?.collections?.totalCount).toBe(1)
    expect(data1?.viewer?.collections?.edges[0]?.node?.title).toBe(title)
    expect(data1?.viewer?.collections?.edges[0]?.node?.description).toBe(null)
    expect(data1?.viewer?.collections?.edges[0]?.node?.cover).toBe(null)
  })
})

describe('collections CURD', () => {
  test('not logged in users can not mutate collections', async () => {
    const server = await testClient()
    const { errors } = await server.executeOperation({
      query: PUT_COLLECTIONS,
      variables: { input: { title: 'test' } },
    })
    expect(errors?.[0]?.message).toBe(
      '"visitor" isn\'t authorized for "putCollection"'
    )
  })
  test('long title/description is not allowed', async () => {
    const server = await testClient({ isAuth: true })
    const { errors } = await server.executeOperation({
      query: PUT_COLLECTIONS,
      variables: { input: { title: 'a'.repeat(21) } },
    })
    expect(errors?.[0]?.message).toBe('Title too long')

    const { errors: errors2 } = await server.executeOperation({
      query: PUT_COLLECTIONS,
      variables: { input: { title: 'test', description: 'a'.repeat(141) } },
    })
    expect(errors2?.[0]?.message).toBe('Description too long')
  })
  describe('cover is checked', () => {
    test('invalid cover input', async () => {
      const server = await testClient({ isAuth: true })
      const { errors } = await server.executeOperation({
        query: PUT_COLLECTIONS,
        variables: { input: { title: 'test', cover: 'invalid cover' } },
      })
      expect(errors?.[0]?.message).toBe('Asset does not exists')
    })

    test('assset not exists in db', async () => {
      const server = await testClient({ isAuth: true })
      const { errors } = await server.executeOperation({
        query: PUT_COLLECTIONS,
        variables: {
          input: {
            title: 'test',
            cover: '11000000-0000-0000-0000-000000000001',
          },
        },
      })
      expect(errors?.[0]?.message).toBe('Asset does not exists')
    })

    test('asset not cover type', async () => {
      const server = await testClient({ isAuth: true })
      const { errors } = await server.executeOperation({
        query: PUT_COLLECTIONS,
        variables: {
          input: {
            title: 'test',
            cover: '00000000-0000-0000-0000-000000000001',
          },
        },
      })
      expect(errors?.[0]?.message).toBe('Asset does not exists')
    })

    test('success', async () => {
      const server = await testClient({ isAuth: true })
      const { data } = await server.executeOperation({
        query: PUT_COLLECTIONS,
        variables: {
          input: {
            title: 'test',
            cover: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          },
        },
      })
      expect(data?.putCollection?.cover).toMatch(/.jpg/)
    })
  })
  describe('update collection', () => {
    test('id is checked', async () => {
      const server = await testClient({ isAuth: true })
      const { errors } = await server.executeOperation({
        query: PUT_COLLECTIONS,
        variables: { input: { id: 'invalid id', title: 'test' } },
      })
      expect(errors?.[0]?.message).toBe('invalid globalId')

      const { errors: errors2 } = await server.executeOperation({
        query: PUT_COLLECTIONS,
        variables: {
          input: {
            id: toGlobalId({ type: NODE_TYPES.Circle, id: '1' }),
            title: 'test',
          },
        },
      })
      expect(errors2?.[0]?.message).toBe('Invalid Collection id')

      const { errors: errors3 } = await server.executeOperation({
        query: PUT_COLLECTIONS,
        variables: {
          input: {
            id: toGlobalId({ type: NODE_TYPES.Collection, id: '999' }),
            title: 'test',
          },
        },
      })
      expect(errors3?.[0]?.message).toBe('Collection not found')

      // can not update others users' collections
      const server2 = await testClient({ isAuth: true, isMatty: true })
      const {
        data: {
          putCollection: { id },
        },
      } = await server2.executeOperation({
        query: PUT_COLLECTIONS,
        variables: { input: { title: 'test' } },
      })
      const { errors: errors4 } = await server.executeOperation({
        query: PUT_COLLECTIONS,
        variables: { input: { title: 'new title', id } },
      })
      expect(errors4?.[0]?.message).toBe('Viewer has no permission')
    })
    test('success', async () => {
      const server = await testClient({ isAuth: true })
      const {
        data: {
          putCollection: { id },
        },
      } = await server.executeOperation({
        query: PUT_COLLECTIONS,
        variables: { input: { title: 'test' } },
      })

      const newTitle = 'new title'

      const { data } = await server.executeOperation({
        query: PUT_COLLECTIONS,
        variables: { input: { title: newTitle, id } },
      })
      expect(data.putCollection.title).toBe(newTitle)
    })
  })
})

describe('delete collections', () => {
  let id: string
  beforeAll(async () => {
    const server = await testClient({ isAuth: true })
    const { data } = await server.executeOperation({
      query: PUT_COLLECTIONS,
      variables: { input: { title: 'test' } },
    })
    id = data?.putCollection?.id
  })
  test('not logged in users can not mutate collections', async () => {
    const server = await testClient()
    const { errors } = await server.executeOperation({
      query: DEL_COLLECTIONS,
      variables: { input: { ids: [id] } },
    })
    expect(errors?.[0]?.message).toBe(
      '"visitor" isn\'t authorized for "deleteCollections"'
    )
  })
  test('ids is checked', async () => {
    const server = await testClient({ isAuth: true })
    const { errors } = await server.executeOperation({
      query: DEL_COLLECTIONS,
      variables: {
        input: { ids: [toGlobalId({ type: NODE_TYPES.Circle, id: '1' })] },
      },
    })
    expect(errors?.[0]?.message).toBe('Invalid collection ids')
  })
  test('success', async () => {
    const server = await testClient({ isAuth: true })

    const { data } = await server.executeOperation({
      query: DEL_COLLECTIONS,
      variables: { input: { ids: [] } },
    })
    expect(data?.deleteCollections).toBe(false)

    const { data: data1 } = await server.executeOperation({
      query: DEL_COLLECTIONS,
      variables: { input: { ids: [id] } },
    })
    expect(data1?.deleteCollections).toBe(true)

    const { data: data2 } = await server.executeOperation({
      query: DEL_COLLECTIONS,
      variables: { input: { ids: [id] } },
    })
    expect(data2?.deleteCollections).toBe(false)
  })
})
