// internal
import { toGlobalId } from 'common/utils'
import { knex } from 'connectors/db'
// local
import { testClient, delay } from './utils'
import { putDraft } from './draft.test'
import { publishArticle } from './article.test'
import { registerUser, updateUserDescription } from './user.test'

const draft = {
  title: `test-${Math.floor(Math.random() * 100)}`,
  content: `test-${Math.floor(Math.random() * 100)}`,
  tags: [`test-${Math.floor(Math.random() * 100)}`]
}

const userDescription = `test-${Math.floor(Math.random() * 100)}`

const user = {
  email: `test-${Math.floor(Math.random() * 100)}@matters.news`,
  displayName: 'test user',
  password: '123',
  codeId: '123'
}

beforeAll(async () => {
  const { id } = await putDraft(draft)
  try {
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
afterAll(knex.destroy)

const GET_USER = `
  query($input: NodeInput!) {
    node(input: $input) {
      ... on User {
        id
        info {
          email
        }
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
      match
      node {
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
`
const FEEDBACK = `
  mutation($input: FeedbackInput!) {
    feedback(input: $input)
  }
`

describe('query nodes of different type', async () => {
  test('query user node', async () => {
    const id = toGlobalId({ type: 'User', id: 1 })
    const { query } = await testClient()
    const { data } = await query({
      query: GET_USER,
      // @ts-ignore
      variables: { input: { id } }
    })
    const node = data && data.node
    expect(node).toMatchObject({ id, info: { email: 'test1@matters.news' } })
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
describe('Search', async () => {
  test('search article', async () => {
    const { query } = await testClient()

    const result = await query({
      query: SEARCH,
      // @ts-ignore
      variables: {
        input: {
          key: draft.title,
          type: 'Article',
          limit: 1
        }
      }
    })

    const search = result && result.data && result.data.search
    const title = search && search[0] && search[0].node && search[0].node.title
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
          limit: 1
        }
      }
    })

    const search = result && result.data && result.data.search
    const content =
      search && search[0] && search[0].node && search[0].node.content
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
          limit: 1
        }
      }
    })

    const search = result && result.data && result.data.search
    const description =
      search &&
      search[0] &&
      search[0].node &&
      search[0].node.info &&
      search[0].node.info.description
    expect(description).toBe(userDescription)
  })
})

describe('Feedback', async () => {
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
