import _get from 'lodash/get'

import { toGlobalId } from 'common/utils'

import {
  delay,
  publishArticle,
  putDraft,
  registerUser,
  testClient,
  updateUserDescription,
} from './utils'

const draft = {
  title: `test-${Math.floor(Math.random() * 100)}`,
  content: `test-${Math.floor(Math.random() * 100)}`,
  tags: [`test-${Math.floor(Math.random() * 100)}`],
}

const userDescription = `test-${Math.floor(Math.random() * 100)}`

const user = {
  email: `test-${Math.floor(Math.random() * 100)}@matters.news`,
  displayName: 'testUser',
  password: '12345678',
  codeId: '123',
}

beforeAll(async () => {
  try {
    const { id } = await putDraft({ draft })
    await publishArticle({ id })
    await registerUser(user)
    await updateUserDescription({
      email: user.email,
      description: userDescription,
    })
  } catch (err) {
    throw err
  }
})

const GET_USER = /* GraphQL */ `
  query($input: NodeInput!) {
    node(input: $input) {
      ... on User {
        id
      }
    }
  }
`
const GET_ARTICLE = /* GraphQL */ `
  query($input: NodeInput!) {
    node(input: $input) {
      ... on Article {
        id
        title
      }
    }
  }
`
const GET_COMMENT = /* GraphQL */ `
  query($input: NodeInput!) {
    node(input: $input) {
      ... on Comment {
        id
        content
      }
    }
  }
`
const SEARCH = /* GraphQL */ `
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

const QUERY_FEATURES = /* GraphQL */ `
  query {
    official {
      features {
        name
        enabled
      }
    }
  }
`

const SET_FEATURE = /* GraphQL */ `
  mutation($input: SetFeatureInput!) {
    setFeature(input: $input) {
      name
      enabled
    }
  }
`

const QUERY_SEEDING_USERS = `
  query($input: ConnectionArgs!) {
    oss {
      seedingUsers(input: $input) {
        totalCount
        edges {
          node {
            id
            userName
          }
        }
      }
    }
  }
`

const TOGGLE_SEEDING_USERS = `
  mutation($input: ToggleSeedingUsersInput!) {
    toggleSeedingUsers(input: $input)
  }
`

describe('query nodes of different type', () => {
  test('query user node', async () => {
    const id = toGlobalId({ type: 'User', id: 1 })
    const { query } = await testClient()
    const result = await query({
      query: GET_USER,
      // @ts-ignore
      variables: { input: { id } },
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
      variables: { input: { id } },
    })
    const node = data && data.node
    expect(node).toEqual({ id, title: 'test draft 1' })
  })

  test('query comment node', async () => {
    const id = toGlobalId({ type: 'Comment', id: 1 })
    const { query } = await testClient()
    const { data } = await query({
      query: GET_COMMENT,
      // @ts-ignore
      variables: { input: { id } },
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
          first: 1,
        },
      },
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
          first: 1,
        },
      },
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
          first: 1,
        },
      },
    })
    const description = _get(
      result,
      'data.search.edges.0.node.info.description'
    )
    expect(description).toBe(userDescription)
  })
})

describe('manage feature flag', () => {
  const errorPath = 'errors.0.extensions.code'
  const adminClient = { isAuth: true, isAdmin: true }
  const userClient = { isAuth: true, isAdmin: false }

  const reducer = (
    result: Record<string, any>,
    feature: { name: string; enabled: boolean }
  ) => ({
    ...result,
    [feature.name]: feature.enabled,
  })

  test('query feature flag', async () => {
    const { query } = await testClient(userClient)
    const { data } = await query({ query: QUERY_FEATURES })

    const features = (data?.official?.features || []).reduce(reducer, {})

    expect(features.add_credit).toBe(true)
    expect(features.circle_management).toBe(true)
    expect(features.circle_interact).toBe(true)
    expect(features.fingerprint).toBe(true)
    expect(features.payment).toBe(true)
    expect(features.payout).toBe(true)
    expect(features.verify_appreciate).toBe(false)
  })

  test('update feature flag', async () => {
    const { query, mutate } = await testClient(userClient)

    const updateData = await mutate({
      mutation: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'off' } },
    })
    expect(_get(updateData, errorPath)).toBe('FORBIDDEN')

    // set feature off
    const { query: adminQuery, mutate: adminMutate } = await testClient(
      adminClient
    )
    const updateData2 = await adminMutate({
      mutation: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'off' } },
    })
    expect(_get(updateData2, 'data.setFeature.enabled')).toBe(false)

    const { data: queryData } = await query({ query: QUERY_FEATURES })
    const features = (queryData?.official?.features || []).reduce(reducer, {})
    expect(features.circle_management).toBe(false)

    const { data: queryData2 } = await adminQuery({ query: QUERY_FEATURES })
    const features2 = (queryData2?.official?.features || []).reduce(reducer, {})
    expect(features2.circle_management).toBe(false)

    // set feature as admin
    const updateData3 = await adminMutate({
      mutation: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'admin' } },
    })
    expect(_get(updateData3, 'data.setFeature.enabled')).toBe(true)

    const { data: queryData3 } = await query({ query: QUERY_FEATURES })
    const features3 = (queryData3?.official?.features || []).reduce(reducer, {})
    expect(features3.circle_management).toBe(false)

    const { data: queryData4 } = await adminQuery({ query: QUERY_FEATURES })
    const features4 = (queryData4?.official?.features || []).reduce(reducer, {})
    expect(features4.circle_management).toBe(true)

    // set feature as seeding
    const updateData4 = await adminMutate({
      mutation: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'seeding' } },
    })
    expect(_get(updateData4, 'data.setFeature.enabled')).toBe(true)

    const { data: queryData5 } = await query({ query: QUERY_FEATURES })
    const features5 = (queryData5?.official?.features || []).reduce(reducer, {})
    expect(features5.circle_management).toBe(true)

    const { data: queryData6 } = await adminQuery({ query: QUERY_FEATURES })
    const features6 = (queryData6?.official?.features || []).reduce(reducer, {})
    expect(features6.circle_management).toBe(true)

    const { query: otherQuery } = await testClient({
      isAuth: true,
      isOnboarding: true,
    })
    const { data: queryData7 } = await otherQuery({ query: QUERY_FEATURES })
    const features7 = (queryData7?.official?.features || []).reduce(reducer, {})
    expect(features7.circle_management).toBe(false)

    // reset feature as on
    const updateData5 = await adminMutate({
      mutation: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'on' } },
    })
    expect(_get(updateData5, 'data.setFeature.enabled')).toBe(true)
  })

  test('manage seeding user', async () => {
    const { query: adminQuery, mutate: adminMutate } = await testClient(
      adminClient
    )
    const { data } = await adminQuery({
      query: QUERY_SEEDING_USERS,
      variables: { input: { first: null } },
    })
    expect(_get(data, 'oss.seedingUsers.totalCount')).toBe(1)

    // remove existing seeding user
    const seedingUser = _get(data, 'oss.seedingUsers.edges[0].node')
    await adminMutate({
      mutation: TOGGLE_SEEDING_USERS,
      variables: { input: { ids: [seedingUser.id], enabled: false } },
    })
    const { data: data2 } = await adminQuery({
      query: QUERY_SEEDING_USERS,
      variables: { input: { first: null } },
    })
    expect(_get(data2, 'oss.seedingUsers.totalCount')).toBe(0)

    // re-add seeding user
    await adminMutate({
      mutation: TOGGLE_SEEDING_USERS,
      variables: { input: { ids: [seedingUser.id], enabled: true } },
    })
    const { data: data3 } = await adminQuery({
      query: QUERY_SEEDING_USERS,
      variables: { input: { first: null } },
    })
    expect(_get(data3, 'oss.seedingUsers.totalCount')).toBe(1)

    // check user couldn't query and mutate
    const { query: userQuery, mutate: userMutate } = await testClient(
      userClient
    )
    const result = await userQuery({
      query: QUERY_SEEDING_USERS,
      variables: { input: { first: null } },
    })
    expect(_get(result, errorPath)).toBe('FORBIDDEN')

    const updateData3 = await userMutate({
      mutation: TOGGLE_SEEDING_USERS,
      variables: { input: { ids: [seedingUser.id], enabled: false } },
    })
    expect(_get(updateData3, errorPath)).toBe('FORBIDDEN')
  })
})
