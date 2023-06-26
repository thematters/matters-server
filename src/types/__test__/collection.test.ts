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
  })
})
