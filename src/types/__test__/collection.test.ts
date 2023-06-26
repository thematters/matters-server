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
})
