import _get from 'lodash/get'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { GQLUserRestrictionType } from 'definitions'

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
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on User {
        id
      }
    }
  }
`

const GET_USER_OSS_BY_USERNAME = /* GraphQL */ `
  query ($input: UserInput!) {
    user(input: $input) {
      id
      userName
      oss {
        score
        boost
        restrictions {
          type
          createdAt
        }
      }
    }
  }
`

const GET_ARTICLE = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Article {
        id
        title
      }
    }
  }
`
const GET_COMMENT = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Comment {
        id
        content
      }
    }
  }
`
const SEARCH = /* GraphQL */ `
  query ($input: SearchInput!) {
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
  mutation ($input: SetFeatureInput!) {
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
    toggleSeedingUsers(input: $input) {
      id
    }
  }
`

const QUERY_BADGED_USERS = `
  query($input: BadgedUsersInput!) {
    oss {
      badgedUsers(input: $input) {
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

const QUERY_RESTRICTED_USERS = /* GraphQL */ `
  query ($input: ConnectionArgs!) {
    oss {
      restrictedUsers(input: $input) {
        totalCount
        edges {
          node {
            id
            userName
            oss {
              restrictions {
                type
                createdAt
              }
            }
          }
        }
      }
    }
  }
`

const TOGGLE_USERS_BADGE = `
  mutation($input: ToggleUsersBadgeInput!) {
    toggleUsersBadge(input: $input) {
      id
    }
  }
`

const PUT_USER_RESTRICTIONS = /* GraphQL */ `
  mutation PutRestrictedUsers($input: PutRestrictedUsersInput!) {
    putRestrictedUsers(input: $input) {
      id
      userName
      oss {
        score
        boost
        restrictions {
          type
          createdAt
        }
      }
    }
  }
`

describe('query nodes of different type', () => {
  test('query user node', async () => {
    const id = toGlobalId({ type: NODE_TYPES.User, id: 1 })
    const server = await testClient()
    const result = await server.executeOperation({
      query: GET_USER,
      variables: { input: { id } },
    })
    const { data } = result
    const node = data && data.node
    expect(node).toMatchObject({ id })
  })

  test('query article node', async () => {
    const id = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
    const server = await testClient()
    const { data } = await server.executeOperation({
      query: GET_ARTICLE,
      variables: { input: { id } },
    })
    const node = data && data.node
    expect(node).toEqual({ id, title: 'test draft 1' })
  })

  test('query comment node', async () => {
    const id = toGlobalId({ type: NODE_TYPES.Comment, id: 1 })
    const server = await testClient()
    const { data } = await server.executeOperation({
      query: GET_COMMENT,
      variables: { input: { id } },
    })
    const node = data && data.node
    expect(node.id).toBe(id)
  })
})

// TODO: fix search tests
describe.skip('Search', () => {
  test('search article', async () => {
    const server = await testClient()

    const result = await server.executeOperation({
      query: SEARCH,
      variables: {
        input: {
          key: draft.title,
          type: NODE_TYPES.Article,
          first: 1,
        },
      },
    })

    const title = _get(result, 'data.search.edges.0.node.title')
    expect(title).toBe(draft.title)
  })

  test('search tag', async () => {
    const server = await testClient()

    const result = await server.executeOperation({
      query: SEARCH,
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
    const server = await testClient()

    const result = await server.executeOperation({
      query: SEARCH,
      variables: {
        input: {
          key: userDescription,
          type: NODE_TYPES.User,
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
    const server = await testClient(userClient)
    const { data } = await server.executeOperation({ query: QUERY_FEATURES })

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
    const server = await testClient(userClient)

    const updateData = await server.executeOperation({
      query: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'off' } },
    })
    expect(_get(updateData, errorPath)).toBe('FORBIDDEN')

    // set feature off
    const serverAdmin = await testClient(adminClient)
    const updateData2 = await serverAdmin.executeOperation({
      query: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'off' } },
    })
    expect(_get(updateData2, 'data.setFeature.enabled')).toBe(false)

    const { data: queryData } = await server.executeOperation({
      query: QUERY_FEATURES,
    })
    const features = (queryData?.official?.features || []).reduce(reducer, {})
    expect(features.circle_management).toBe(false)

    const { data: queryData2 } = await serverAdmin.executeOperation({
      query: QUERY_FEATURES,
    })
    const features2 = (queryData2?.official?.features || []).reduce(reducer, {})
    expect(features2.circle_management).toBe(false)

    // set feature as admin
    const updateData3 = await serverAdmin.executeOperation({
      query: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'admin' } },
    })
    expect(_get(updateData3, 'data.setFeature.enabled')).toBe(true)

    const { data: queryData3 } = await server.executeOperation({
      query: QUERY_FEATURES,
    })
    const features3 = (queryData3?.official?.features || []).reduce(reducer, {})
    expect(features3.circle_management).toBe(false)

    const { data: queryData4 } = await serverAdmin.executeOperation({
      query: QUERY_FEATURES,
    })
    const features4 = (queryData4?.official?.features || []).reduce(reducer, {})
    expect(features4.circle_management).toBe(true)

    // set feature as seeding
    const updateData4 = await serverAdmin.executeOperation({
      query: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'seeding' } },
    })
    expect(_get(updateData4, 'data.setFeature.enabled')).toBe(true)

    const { data: queryData5 } = await server.executeOperation({
      query: QUERY_FEATURES,
    })
    const features5 = (queryData5?.official?.features || []).reduce(reducer, {})
    expect(features5.circle_management).toBe(true)

    const { data: queryData6 } = await serverAdmin.executeOperation({
      query: QUERY_FEATURES,
    })
    const features6 = (queryData6?.official?.features || []).reduce(reducer, {})
    expect(features6.circle_management).toBe(true)

    const serverOther = await testClient({
      isAuth: true,
      isOnboarding: true,
    })
    const { data: queryData7 } = await serverOther.executeOperation({
      query: QUERY_FEATURES,
    })
    const features7 = (queryData7?.official?.features || []).reduce(reducer, {})
    expect(features7.circle_management).toBe(false)

    // reset feature as on
    const updateData5 = await serverAdmin.executeOperation({
      query: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'on' } },
    })
    expect(_get(updateData5, 'data.setFeature.enabled')).toBe(true)
  })

  test('manage seeding user', async () => {
    const serverAdmin = await testClient(adminClient)
    const { data } = await serverAdmin.executeOperation({
      query: QUERY_SEEDING_USERS,
      variables: { input: { first: null } },
    })
    expect(_get(data, 'oss.seedingUsers.totalCount')).toBe(1)

    // remove existing seeding user
    const seedingUser = _get(data, 'oss.seedingUsers.edges[0].node')
    await serverAdmin.executeOperation({
      query: TOGGLE_SEEDING_USERS,
      variables: { input: { ids: [seedingUser.id], enabled: false } },
    })
    const { data: data2 } = await serverAdmin.executeOperation({
      query: QUERY_SEEDING_USERS,
      variables: { input: { first: null } },
    })
    expect(_get(data2, 'oss.seedingUsers.totalCount')).toBe(0)

    // re-add seeding user
    await serverAdmin.executeOperation({
      query: TOGGLE_SEEDING_USERS,
      variables: { input: { ids: [seedingUser.id], enabled: true } },
    })
    const { data: data3 } = await serverAdmin.executeOperation({
      query: QUERY_SEEDING_USERS,
      variables: { input: { first: null } },
    })
    expect(_get(data3, 'oss.seedingUsers.totalCount')).toBe(1)

    // check user couldn't query and mutate
    const serverUser = await testClient(userClient)
    const result = await serverUser.executeOperation({
      query: QUERY_SEEDING_USERS,
      variables: { input: { first: null } },
    })
    expect(_get(result, errorPath)).toBe('FORBIDDEN')

    const updateData3 = await serverUser.executeOperation({
      query: TOGGLE_SEEDING_USERS,
      variables: { input: { ids: [seedingUser.id], enabled: false } },
    })
    expect(_get(updateData3, errorPath)).toBe('FORBIDDEN')
  })
})

describe('manage user badges', () => {
  test('toggle user badge', async () => {
    const errorPath = 'errors.0.extensions.code'
    const adminClient = { isAuth: true, isAdmin: true }
    const userClient = { isAuth: true, isAdmin: false }

    const badgeType = 'golden_motor'
    const userId = toGlobalId({ type: NODE_TYPES.User, id: '1' })

    const serverAdmin = await testClient(adminClient)
    const { data } = await serverAdmin.executeOperation({
      query: QUERY_BADGED_USERS,
      variables: { input: { first: null, type: badgeType } },
    })
    expect(_get(data, 'oss.badgedUsers.totalCount')).toBe(0)

    // remove existing badged user
    await serverAdmin.executeOperation({
      query: TOGGLE_USERS_BADGE,
      variables: { input: { ids: [userId], type: badgeType, enabled: true } },
    })
    const { data: data2 } = await serverAdmin.executeOperation({
      query: QUERY_BADGED_USERS,
      variables: { input: { first: null, type: badgeType } },
    })
    expect(_get(data2, 'oss.badgedUsers.totalCount')).toBe(1)

    // re-disable badged user
    await serverAdmin.executeOperation({
      query: TOGGLE_USERS_BADGE,
      variables: {
        input: { ids: [userId], type: badgeType, enabled: false },
      },
    })
    const { data: data3 } = await serverAdmin.executeOperation({
      query: QUERY_BADGED_USERS,
      variables: { input: { first: null, type: badgeType } },
    })
    expect(_get(data3, 'oss.badgedUsers.totalCount')).toBe(0)

    // check user couldn't query and mutate
    const serverUser = await testClient(userClient)
    const result = await serverUser.executeOperation({
      query: QUERY_BADGED_USERS,
      variables: { input: { first: null, type: badgeType } },
    })
    expect(_get(result, errorPath)).toBe('FORBIDDEN')

    const updateData3 = await serverUser.executeOperation({
      query: TOGGLE_USERS_BADGE,
      variables: {
        input: { ids: [userId], type: badgeType, enabled: false },
      },
    })
    expect(_get(updateData3, errorPath)).toBe('FORBIDDEN')
  })
})

describe('manage user restrictions', () => {
  const userId1 = toGlobalId({ type: NODE_TYPES.User, id: '2' })
  const userId2 = toGlobalId({ type: NODE_TYPES.User, id: '3' })
  const userName1 = 'test2'
  test.only('no restrictions by default', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
    })

    // query this single user
    const { data: data1 } = await server.executeOperation({
      query: GET_USER_OSS_BY_USERNAME,
      variables: { input: { userName: userName1 } },
    })
    expect(data1!.user.oss.restrictions).toEqual([])

    // query restricted users
    const { data: data2 } = await server.executeOperation({
      query: QUERY_RESTRICTED_USERS,
      variables: { input: {} },
    })
    expect(data2!.oss.restrictedUsers.totalCount).toBe(0)
  })
  test('only admin can update restrictions', async () => {
    const notAdminServer = await testClient({
      isAuth: true,
      isAdmin: false,
    })
    const { errors } = await notAdminServer.executeOperation({
      query: PUT_USER_RESTRICTIONS,
      variables: {
        input: { ids: [userId1], restrictions: ['articleHottest'] },
      },
    })
    expect(errors![0]!.extensions!.code).toBe('FORBIDDEN')

    const adminServer = await testClient({
      isAuth: true,
      isAdmin: true,
    })
    const { data } = await adminServer.executeOperation({
      query: PUT_USER_RESTRICTIONS,
      variables: {
        input: { ids: [userId1], restrictions: ['articleHottest'] },
      },
    })
    expect(
      data!.putRestrictedUsers![0]!.oss!.restrictions!.map(
        ({ type }: { type: GQLUserRestrictionType }) => type
      )
    ).toEqual(['articleHottest'])

    // query restricted users
    const { data: data2 } = await adminServer.executeOperation({
      query: QUERY_RESTRICTED_USERS,
      variables: { input: {} },
    })
    expect(data2!.oss.restrictedUsers.totalCount).toBe(1)
  })
  test('reset restrictions', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
    })
    const { data } = await server.executeOperation({
      query: PUT_USER_RESTRICTIONS,
      variables: { input: { ids: [userId1], restrictions: [] } },
    })
    expect(data!.putRestrictedUsers![0]!.oss!.restrictions).toEqual([])
  })
  test('bulk update', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
    })
    const { data } = await server.executeOperation({
      query: PUT_USER_RESTRICTIONS,
      variables: {
        input: { ids: [userId1, userId2], restrictions: ['articleHottest'] },
      },
    })
    expect(
      data!.putRestrictedUsers![0]!.oss!.restrictions.map(
        ({ type }: { type: GQLUserRestrictionType }) => type
      )
    ).toEqual(['articleHottest'])
    expect(
      data!.putRestrictedUsers![1]!.oss!.restrictions.map(
        ({ type }: { type: GQLUserRestrictionType }) => type
      )
    ).toEqual(['articleHottest'])

    // query restricted users
    const { data: data2 } = await server.executeOperation({
      query: QUERY_RESTRICTED_USERS,
      variables: { input: {} },
    })
    expect(data2!.oss.restrictedUsers.totalCount).toBe(2)
  })
})
