import _get from 'lodash/get'

import { toGlobalId } from 'common/utils'

import {
  delay,
  publishArticle,
  putDraft,
  registerUser,
  testClient,
  updateUserDescription
} from './utils'

const draft = {
  title: `test-${Math.floor(Math.random() * 100)}`,
  content: `test-${Math.floor(Math.random() * 100)}`,
  tags: [`test-${Math.floor(Math.random() * 100)}`]
}

const userDescription = `test-${Math.floor(Math.random() * 100)}`

const user = {
  email: `test-${Math.floor(Math.random() * 100)}@matters.news`,
  displayName: 'testUser',
  password: '12345678',
  codeId: '123'
}

beforeAll(async () => {
  try {
    const { id } = await putDraft(draft)
    await publishArticle({ id, delay: 0 })
    await registerUser(user)
    await updateUserDescription({
      email: user.email,
      description: userDescription
    })
  } catch (err) {
    throw err
  }
})

const GET_USER = `
  query($input: NodeInput!) {
    node(input: $input) {
      ... on User {
        id
      }
    }
  }
`
const GET_ARTICLE = `
  query($input: NodeInput!) {
    node(input: $input) {
      ... on Article {
        id
        title
      }
    }
  }
`
const GET_COMMENT = `
  query($input: NodeInput!) {
    node(input: $input) {
      ... on Comment {
        id
        content
      }
    }
  }
`
const SEARCH = `
  query($input: SearchInput!) {
    search(input: $input) {
      edges {
        node {
          id
          ... on Article {
            title
            content
          }
          ... on Tag {
            content
          }
          ... on User {
            info {
              userName
              displayName
              description
            }
          }
        }
      }
    }
  }
`
const FEEDBACK = `
  mutation($input: FeedbackInput!) {
    feedback(input: $input)
  }
`

describe('query nodes of different type', () => {
  test('query user node', async () => {
    const id = toGlobalId({ type: 'User', id: 1 })
    const { query } = await testClient()
    const result = await query({
      query: GET_USER,
      // @ts-ignore
      variables: { input: { id } }
    })
    const { data } = result
    const node = data && data.node
    expect(node).toMatchObject({ id })
  })

  test('query article node', async () => {
    const id = toGlobalId({ type: 'Article', id: 1 })
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTICLE,
      // @ts-ignore
      variables: { input: { id } }
    })
    const node = data && data.node
    expect(node).toEqual({ id, title: 'test article 1' })
  })

  test('query comment node', async () => {
    const id = toGlobalId({ type: 'Comment', id: 1 })
    const { query } = await testClient()
    const { data } = await query({
      query: GET_COMMENT,
      // @ts-ignore
      variables: { input: { id } }
    })
    const node = data && data.node
    expect(node.id).toBe(id)
  })
})

// TODO: fix search tests
describe.skip('Search', () => {
  test('search article', async () => {
    const { query } = await testClient()

    const result = await query({
      query: SEARCH,
      // @ts-ignore
      variables: {
        input: {
          key: draft.title,
          type: 'Article',
          first: 1
        }
      }
    })

    const title = _get(result, 'data.search.edges.0.node.title')
    expect(title).toBe(draft.title)
  })

  test('search tag', async () => {
    const { query } = await testClient()

    const result = await query({
      query: SEARCH,
      // @ts-ignore
      variables: {
        input: {
          key: draft.tags[0],
          type: 'Tag',
          first: 1
        }
      }
    })

    const content = _get(result, 'data.search.edges.0.node.content')
    expect(content).toBe(draft.tags[0])
  })

  test('search user', async () => {
    await delay(1000)
    const { query } = await testClient()

    const result = await query({
      query: SEARCH,
      // @ts-ignore
      variables: {
        input: {
          key: userDescription,
          type: 'User',
          first: 1
        }
      }
    })
    const description = _get(
      result,
      'data.search.edges.0.node.info.description'
    )
    expect(description).toBe(userDescription)
  })
})

describe('Feedback', () => {
  test('submit a feedback', async () => {
    const { mutate } = await testClient({ isAuth: true })
    const result = await mutate({
      mutation: FEEDBACK,
      // @ts-ignore
      variables: {
        input: {
          category: 'product',
          description: 'authed description'
        }
      }
    })
    expect(result.data.feedback).toBe(true)
  })

  test('submit a feedback with assets', async () => {
    const { mutate } = await testClient({ isAuth: true })
    const result = await mutate({
      mutation: FEEDBACK,
      // @ts-ignore
      variables: {
        input: {
          category: 'product',
          description: 'authed description',
          assetIds: ['00000000-0000-0000-0000-000000000010']
        }
      }
    })
    expect(result.data.feedback).toBe(true)
  })
})
