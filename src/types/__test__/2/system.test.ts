import type {
  Connections,
  GQLBadgeType,
  GQLUserRestrictionType,
} from 'definitions'

import _get from 'lodash/get'

import { NODE_TYPES, USER_STATE } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { MomentService, CampaignService } from 'connectors'

import { createCampaign } from 'connectors/__test__/utils'

import {
  delay,
  publishArticle,
  putDraft,
  registerUser,
  testClient,
  updateUserDescription,
  genConnections,
  closeConnections,
} from '../utils'

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

let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
  const { id } = await putDraft({ draft }, connections)
  await publishArticle({ id }, connections)
  await registerUser(user, connections)
  await updateUserDescription(
    {
      email: user.email,
      description: userDescription,
    },
    connections
  )
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
}, 50000)

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
      displayName
      oss {
        score
        boost
        restrictions {
          type
          createdAt
        }
      }
      info {
        badges {
          type
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
const GET_ARTICLE_VERSION = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on ArticleVersion {
        id
        contents {
          html
          markdown
        }
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
const GET_NODES = /* GraphQL */ `
  query ($input: NodesInput!) {
    nodes(input: $input) {
      ... on Article {
        id
        title
      }
      ... on Comment {
        id
        content
      }
      ... on User {
        id
        userName
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
        value
      }
    }
  }
`

const SET_FEATURE = /* GraphQL */ `
  mutation ($input: SetFeatureInput!) {
    setFeature(input: $input) {
      name
      enabled
      value
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
      userName
      displayName
      info {
        badges {
          type
        }
      }
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
    const server = await testClient({ connections })
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
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: GET_ARTICLE,
      variables: { input: { id } },
    })
    const node = data && data.node
    expect(node).toEqual({ id, title: 'test article 1' })
  })

  test('query article version node', async () => {
    const id = toGlobalId({ type: NODE_TYPES.ArticleVersion, id: 1 })
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_ARTICLE_VERSION,
      variables: { input: { id } },
    })
    expect(errors).toBeUndefined()
    expect(data.node.id).toBe(id)
    expect(data.node.contents.html).toBeDefined()
  })

  test('query comment node', async () => {
    const id = toGlobalId({ type: NODE_TYPES.Comment, id: 1 })
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: GET_COMMENT,
      variables: { input: { id } },
    })
    const node = data && data.node
    expect(node.id).toBe(id)
  })

  test('query nodes', async () => {
    const userId = toGlobalId({ type: NODE_TYPES.User, id: 1 })
    const commentId = toGlobalId({ type: NODE_TYPES.Comment, id: 1 })
    const articleId1 = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
    const articleId2 = toGlobalId({ type: NODE_TYPES.Article, id: 2 })
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: GET_NODES,
      variables: {
        input: { ids: [userId, commentId, articleId1, articleId2] },
      },
    })
    expect(data.nodes.length).toBe(4)
    expect(data.nodes[0].id).toBe(userId)
    expect(data.nodes[0].userName).toBeDefined()
    expect(data.nodes[1].id).toBe(commentId)
    expect(data.nodes[1].content).toBeDefined()
    expect(data.nodes[2].id).toBe(articleId1)
    expect(data.nodes[2].title).toBeDefined()
    expect(data.nodes[3].id).toBe(articleId2)
    expect(data.nodes[3].title).toBeDefined()
  })
})

// TODO: fix search tests
describe.skip('Search', () => {
  test('search article', async () => {
    const server = await testClient({ connections })

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
    const server = await testClient({ connections })

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
    const server = await testClient({ connections })

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
    feature: { name: string; enabled: boolean; value: number | null }
  ) => ({
    ...result,
    [feature.name]: { enabled: feature.enabled, value: feature.value },
  })

  test('query feature flag', async () => {
    const server = await testClient({ ...userClient, connections })
    const { data } = await server.executeOperation({ query: QUERY_FEATURES })

    const features = (data?.official?.features || []).reduce(reducer, {})

    expect(features.add_credit.enabled).toBe(true)
    expect(features.circle_management.enabled).toBe(true)
    expect(features.circle_interact.enabled).toBe(true)
    expect(features.fingerprint.enabled).toBe(true)
    expect(features.payment.enabled).toBe(true)
    expect(features.payout.enabled).toBe(true)
    expect(features.verify_appreciate.enabled).toBe(false)
    expect(features.spam_detection.enabled).toBe(false)
    expect(features.spam_detection.value).not.toBeNull()
  })

  test('update feature flag', async () => {
    const server = await testClient({ ...userClient, connections })

    const updateData = await server.executeOperation({
      query: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'off' } },
    })
    expect(_get(updateData, errorPath)).toBe('FORBIDDEN')

    // set feature off
    const serverAdmin = await testClient({ ...adminClient, connections })
    const updateData2 = await serverAdmin.executeOperation({
      query: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'off' } },
    })
    expect(_get(updateData2, 'data.setFeature.enabled')).toBe(false)

    const { data: queryData } = await server.executeOperation({
      query: QUERY_FEATURES,
    })
    const features = (queryData?.official?.features || []).reduce(reducer, {})
    expect(features.circle_management.enabled).toBe(false)

    const { data: queryData2 } = await serverAdmin.executeOperation({
      query: QUERY_FEATURES,
    })
    const features2 = (queryData2?.official?.features || []).reduce(reducer, {})
    expect(features2.circle_management.enabled).toBe(false)

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
    expect(features3.circle_management.enabled).toBe(false)

    const { data: queryData4 } = await serverAdmin.executeOperation({
      query: QUERY_FEATURES,
    })
    const features4 = (queryData4?.official?.features || []).reduce(reducer, {})
    expect(features4.circle_management.enabled).toBe(true)

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
    expect(features5.circle_management.enabled).toBe(true)

    const { data: queryData6 } = await serverAdmin.executeOperation({
      query: QUERY_FEATURES,
    })
    const features6 = (queryData6?.official?.features || []).reduce(reducer, {})
    expect(features6.circle_management.enabled).toBe(true)

    // reset feature as on
    const updateData5 = await serverAdmin.executeOperation({
      query: SET_FEATURE,
      variables: { input: { name: 'circle_management', flag: 'on' } },
    })
    expect(_get(updateData5, 'data.setFeature.enabled')).toBe(true)

    // set value
    const updateData6 = await serverAdmin.executeOperation({
      query: SET_FEATURE,
      variables: { input: { name: 'spam_detection', flag: 'on', value: 0.9 } },
    })
    expect(_get(updateData6, 'data.setFeature.enabled')).toBe(true)
    expect(_get(updateData6, 'data.setFeature.value')).toBe(0.9)
  })

  test('manage seeding user', async () => {
    const serverAdmin = await testClient({ ...adminClient, connections })
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
    const serverUser = await testClient({ ...userClient, connections })
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
  test('add nomad badges with `ToggleUsersBadge`', async () => {
    const serverAdmin = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const result1 = await serverAdmin.executeOperation({
      query: GET_USER_OSS_BY_USERNAME,
      variables: { input: { userName: 'test2' } },
    })
    expect(
      result1?.data?.user?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad1')
    ).toBe(false)

    // expect(_get(data, 'user.userName')).toBe(userName)
    const toggleUserId = toGlobalId({ type: NODE_TYPES.User, id: 2 })

    let resBadges = await serverAdmin.executeOperation({
      query: TOGGLE_USERS_BADGE,
      variables: {
        input: {
          ids: [toggleUserId],
          type: 'nomad1',
          enabled: true,
        },
      },
    })
    expect(
      resBadges?.data?.toggleUsersBadge?.[0]?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad1')
    ).toBe(true)

    resBadges = await serverAdmin.executeOperation({
      query: TOGGLE_USERS_BADGE,
      variables: {
        input: {
          ids: [toggleUserId],
          type: 'nomad2',
          enabled: true,
        },
      },
    })
    expect(
      resBadges?.data?.toggleUsersBadge?.[0]?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad1')
    ).toBe(false)
    expect(
      resBadges.data?.toggleUsersBadge?.[0]?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad2')
    ).toBe(true)

    resBadges = await serverAdmin.executeOperation({
      query: TOGGLE_USERS_BADGE,
      variables: {
        input: {
          ids: [toggleUserId],
          type: 'nomad3',
          enabled: true,
        },
      },
    })
    expect(
      resBadges.data?.toggleUsersBadge?.[0]?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad1')
    ).toBe(false)
    expect(
      resBadges.data?.toggleUsersBadge?.[0]?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad2')
    ).toBe(false)
    expect(
      resBadges.data?.toggleUsersBadge?.[0]?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad3')
    ).toBe(true)

    resBadges = await serverAdmin.executeOperation({
      query: TOGGLE_USERS_BADGE,
      variables: {
        input: {
          ids: [toggleUserId],
          type: 'nomad4',
          enabled: true,
        },
      },
    })
    expect(
      resBadges.data?.toggleUsersBadge?.[0]?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad3')
    ).toBe(false)
    expect(
      resBadges.data?.toggleUsersBadge?.[0]?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad4')
    ).toBe(true)

    resBadges = await serverAdmin.executeOperation({
      query: TOGGLE_USERS_BADGE,
      variables: {
        input: {
          ids: [toggleUserId],
          type: 'nomad4',
          enabled: false,
        },
      },
    })
    expect(
      resBadges.data?.toggleUsersBadge?.[0]?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad3')
    ).toBe(false)
    expect(
      resBadges.data?.toggleUsersBadge?.[0]?.info?.badges
        ?.map(({ type }: { type: GQLBadgeType }) => type)
        ?.includes('nomad4')
    ).toBe(false)
  })

  test('toggle user badge', async () => {
    const errorPath = 'errors.0.extensions.code'
    const adminClient = { isAuth: true, isAdmin: true, connections }
    const userClient = { isAuth: true, isAdmin: false, connections }

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

    // enable another 'nomad3' for badged user
    await serverAdmin.executeOperation({
      query: TOGGLE_USERS_BADGE,
      variables: {
        input: { ids: [userId], type: 'nomad3', enabled: true },
      },
    })
    const { data: data4 } = await serverAdmin.executeOperation({
      query: QUERY_BADGED_USERS,
      variables: { input: { first: null, type: 'nomad3' } },
    })
    expect(_get(data4, 'oss.badgedUsers.totalCount')).toBe(1)

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
  test('no restrictions by default', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
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
      connections,
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
      connections,
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
      connections,
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
      connections,
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
    expect(
      data2!.oss.restrictedUsers.edges[0].node.oss!.restrictions.map(
        ({ type }: { type: GQLUserRestrictionType }) => type
      )
    ).toEqual(['articleHottest'])
  })
})

describe('submitReport', () => {
  const SUBMIT_REPORT = /* GraphQL */ `
    mutation ($input: SubmitReportInput!) {
      submitReport(input: $input) {
        id
        reporter {
          id
        }
        target {
          ... on Article {
            id
            state
          }
          ... on Moment {
            id
          }
        }
      }
    }
  `
  const GET_REPORTS = /* GraphQL */ `
    query ($input: ConnectionArgs!) {
      oss {
        reports(input: $input) {
          totalCount
          edges {
            node {
              id
              reporter {
                id
              }
              target {
                ... on Article {
                  id
                }
                ... on Moment {
                  id
                }
              }
            }
          }
        }
      }
    }
  `

  test('submit report successfully', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const { data, errors } = await server.executeOperation({
      query: SUBMIT_REPORT,
      variables: {
        input: {
          targetId: toGlobalId({ type: NODE_TYPES.Article, id: 1 }),
          reason: 'other',
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.submitReport.id).toBeDefined()
    expect(data.submitReport.reporter.id).toBeDefined()
    expect(data.submitReport.target.id).toBeDefined()

    const momentService = new MomentService(connections)
    const moment = await momentService.create(
      { content: 'test' },
      { id: '4', state: USER_STATE.active, userName: 'test' }
    )
    const { data: data2, errors: errors2 } = await server.executeOperation({
      query: SUBMIT_REPORT,
      variables: {
        input: {
          targetId: toGlobalId({ type: NODE_TYPES.Moment, id: moment.id }),
          reason: 'other',
        },
      },
    })
    expect(errors2).toBeUndefined()
    expect(data2.submitReport.id).toBeDefined()
    expect(data2.submitReport.reporter.id).toBeDefined()
    expect(data2.submitReport.target.id).toBeDefined()

    // query reports
    const { data: dataQuery, errors: errorsQuery } =
      await server.executeOperation({
        query: GET_REPORTS,
        variables: {
          input: {
            first: null,
          },
        },
      })
    expect(errorsQuery).toBeUndefined()
    expect(dataQuery.oss.reports.totalCount).toBe(2)
    expect(dataQuery.oss.reports.edges[0].node.reporter.id).toBeDefined()
    expect(dataQuery.oss.reports.edges[0].node.target.id).toBeDefined()
  })
})

describe('setBoost', () => {
  const SET_BOOST = /* GraphQL */ `
    mutation ($input: SetBoostInput!) {
      setBoost(input: $input) {
        id
        ... on Article {
          oss {
            boost
          }
        }
        ... on WritingChallenge {
          oss {
            boost
          }
        }
      }
    }
  `
  test('set boost successfully', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    // Article
    const { data: data1, errors: errors1 } = await server.executeOperation({
      query: SET_BOOST,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: 1 }),
          boost: 10,
          type: 'Article',
        },
      },
    })
    expect(errors1).toBeUndefined()
    expect(data1.setBoost.id).toBeDefined()
    expect(data1.setBoost.oss.boost).toBe(10)
    // Campaign
    const campaignService = new CampaignService(connections)
    const [campaign] = await createCampaign(campaignService)

    const { data: data2, errors: errors2 } = await server.executeOperation({
      query: SET_BOOST,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Campaign, id: campaign.id }),
          boost: 10,
          type: 'Campaign',
        },
      },
    })
    expect(errors2).toBeUndefined()
    expect(data2.setBoost.id).toBeDefined()
    expect(data2.setBoost.oss.boost).toBe(10)
  })
})

describe('setSpamStatus', () => {
  const SET_SPAM_STATUS = /* GraphQL */ `
    mutation ($input: SetSpamStatusInput!) {
      setSpamStatus(input: $input) {
        id
        ... on Article {
          oss {
            spamStatus {
              isSpam
            }
          }
        }
      }
    }
  `
  test('set spam status successfully', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: SET_SPAM_STATUS,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Article, id: 1 }),
          isSpam: true,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.setSpamStatus.oss.spamStatus.isSpam).toBe(true)
  })
})
