import _ from 'lodash'

import { AUTH_MODE, NODE_TYPES, SCOPE_PREFIX } from 'common/enums/index.js'
import { toGlobalId } from 'common/utils/index.js'

import {
  adminUser,
  defaultTestUser,
  getUserContext,
  testClient,
} from './utils.js'

const ARTICLE_ID = toGlobalId({ type: NODE_TYPES.Article, id: 2 })

const queryScopes = [
  `${SCOPE_PREFIX.query}:likerId`,
  `${SCOPE_PREFIX.query}:info:email`,
  `${SCOPE_PREFIX.query}:recommendation`,
]

const mutationScopes = [
  `${SCOPE_PREFIX.mutation}:level1`,
  `${SCOPE_PREFIX.mutation}:level2:putComment`,
  `${SCOPE_PREFIX.mutation}:level3:clearSearchHistory`,
]

const mutationLevel3Scope = [`${SCOPE_PREFIX.mutation}:level3`]

const VIEWER_SCOPED_PRIVATE = /* GraphQL */ `
  query ($input: UserInput!) {
    viewer {
      id
      displayName
      likerId
      info {
        email
      }
    }
    user(input: $input) {
      displayName
    }
  }
`

const VIEWER_NO_SCOPED_PRIVATE = /* GraphQL */ `
  query {
    viewer {
      settings {
        notification {
          mention
        }
      }
    }
  }
`

const VIEWER_SCOPED_WITH_OTHER_PRIVATE = /* GraphQL */ `
  query ($input: UserInput!) {
    viewer {
      info {
        email
      }
    }
    user(input: $input) {
      info {
        email
      }
    }
  }
`

const VIEWER_NESTED_OTHER_PARIVATE = /* GraphQL */ `
  query {
    viewer {
      info {
        email
      }
      recommendation {
        authors(input: { first: 1 }) {
          edges {
            node {
              id
              info {
                email
              }
            }
          }
        }
      }
    }
  }
`

const UPDATE_USER_INFO_DESCRIPTION = /* GraphQL */ `
  mutation UpdateUserInfo($input: UpdateUserInfoInput!) {
    updateUserInfo(input: $input) {
      info {
        description
      }
    }
  }
`

const CREATE_COMMENT = /* GraphQL */ `
  mutation($content: String!) {
    putComment(input: {
      comment: {
        content: $content,
        type: article,
        articleId: "${ARTICLE_ID}" }
      }) {
      id
      content
    }
  }
`

const COLLAPSE_COMMENT = /* GraphQL */ `
  mutation CollapseComment($id: ID!) {
    updateCommentsState(input: { ids: [$id], state: collapsed }) {
      id
      state
    }
  }
`

const CLEAR_SEARCH_HISTORY = /* GraphQL */ `
  mutation {
    clearSearchHistory
  }
`

const prepare = async ({
  email,
  mode,
  scope,
}: {
  email: string
  mode?: string
  scope?: { [key: string]: any }
}) => {
  const context = await getUserContext({ email })
  context.viewer.authMode = mode || context.viewer.role
  // @ts-ignore
  context.viewer.scope = scope || {}

  const server = await testClient({ context })
  return { context, server }
}

/**
 * Check anonymous query and mutation are functional or not.
 *
 * mode: 'visitor'
 */
describe('Anonymous query and mutation', () => {
  test('query with public and private fields', async () => {
    const server = await testClient({ isAuth: false })
    const otherUserName = 'test2'
    const { data } = await server.executeOperation({
      query: VIEWER_SCOPED_PRIVATE,
      variables: { input: { userName: otherUserName } },
    })
    expect(data && data.viewer.id).toBe('')
    expect(data && data.viewer.displayName).toBe(null)
    expect(data && data.viewer.info.email).toBe(null)
    expect(data && data.user.displayName).toBe(otherUserName)
  })

  test('query with private fields', async () => {
    const server = await testClient({ isAuth: false })
    const otherUserName = 'test2'
    const error_case = await server.executeOperation({
      query: VIEWER_SCOPED_WITH_OTHER_PRIVATE,
      variables: { input: { userName: otherUserName } },
    })
    expect(_.get(error_case, 'errors.length')).toBe(1)
    expect(_.get(error_case, 'errors.0.message')).toBeTruthy()
  })

  test('query nested other private fields', async () => {
    const server = await testClient({ isAuth: false })
    const errorCase1 = await server.executeOperation({
      query: VIEWER_NESTED_OTHER_PARIVATE,
    })

    try {
      expect(errorCase1 && errorCase1.errors && errorCase1.errors.length).toBe(
        1
      )
      expect(
        errorCase1 && errorCase1.errors && errorCase1.errors[0].message
      ).toBeTruthy()
    } catch {
      const hasNoAuthors =
        _.get(errorCase1.data, 'viewer.recommendation.authors.edges', [])
          .length <= 0
      expect(hasNoAuthors).toBeTruthy()
    }
  })

  test('level1 mutation', async () => {
    const description = 'foo bar'
    const server = await testClient({ isAuth: false })
    const { errors } = await server.executeOperation({
      query: UPDATE_USER_INFO_DESCRIPTION,
      variables: { input: { description } },
    })
    expect(errors && errors.length).toBe(1)
    expect(errors && errors[0].message).toBeTruthy()
  })

  test('level2 mutation', async () => {
    const content = 'test comment content'
    const server = await testClient({ isAuth: false })
    const { errors } = await server.executeOperation({
      query: CREATE_COMMENT,
      variables: { content },
    })
    expect(errors && errors.length).toBe(1)
    expect(errors && errors[0].message).toBeTruthy()
  })

  test('level3 mutation', async () => {
    const server = await testClient({ isAuth: false })
    const { errors } = await server.executeOperation({
      query: CLEAR_SEARCH_HISTORY,
    })
    expect(errors && errors.length).toBe(1)
    expect(errors && errors[0].message).toBeTruthy()
  })
})

/**
 * Check OAuth viewer query and mutation are functional or not.
 *
 * mode: 'oauth'
 */
describe('OAuth viewer query and mutation', () => {
  test('query with public and private fields', async () => {
    const { context, server } = await prepare({
      email: defaultTestUser.email,
      mode: AUTH_MODE.oauth,
      scope: queryScopes,
    })
    const otherUserName = 'test2'
    const { data } = await server.executeOperation({
      query: VIEWER_SCOPED_PRIVATE,
      variables: { input: { userName: otherUserName } },
    })

    expect(data && data.viewer.displayName).toBe(context.viewer.displayName)
    expect(data && data.viewer.info.email).toBe(context.viewer.email)
    expect(data && data.user.displayName).toBe(otherUserName)
  })

  test('query with no scoped and other private fields', async () => {
    const { server } = await prepare({
      email: defaultTestUser.email,
      mode: AUTH_MODE.oauth,
      scope: queryScopes,
    })

    // query no scope field error
    const errorCase1 = await server.executeOperation({
      query: VIEWER_NO_SCOPED_PRIVATE,
    })
    expect(errorCase1 && errorCase1.errors && errorCase1.errors.length).toBe(1)
    expect(
      errorCase1 && errorCase1.errors && errorCase1.errors[0].message
    ).toBeTruthy()

    // query other private field error
    const otherUserName = 'test2'
    const errorCase2 = await server.executeOperation({
      query: VIEWER_SCOPED_WITH_OTHER_PRIVATE,
      variables: { input: { userName: otherUserName } },
    })
    expect(errorCase2 && errorCase2.errors && errorCase2.errors.length).toBe(1)
    expect(
      errorCase2 && errorCase2.errors && errorCase2.errors[0].message
    ).toBeTruthy()
  })

  test('query nested other private fields', async () => {
    const { server } = await prepare({
      email: defaultTestUser.email,
      mode: AUTH_MODE.oauth,
      scope: queryScopes,
    })

    const errorCase1 = await server.executeOperation({
      query: VIEWER_NESTED_OTHER_PARIVATE,
    })

    try {
      expect(errorCase1 && errorCase1.errors && errorCase1.errors.length).toBe(
        1
      )
      expect(
        errorCase1 && errorCase1.errors && errorCase1.errors[0].message
      ).toBeTruthy()
    } catch {
      const hasNoAuthors =
        _.get(errorCase1.data, 'viewer.recommendation.authors.edges', [])
          .length <= 0

      expect(hasNoAuthors).toBeTruthy()
    }
  })

  test('level1 mutation', async () => {
    const description = 'foo bar'

    // no scoped
    const { server: serverNoScoped } = await prepare({
      email: defaultTestUser.email,
      mode: AUTH_MODE.oauth,
      scope: queryScopes, // only have query scopes
    })
    const { errors } = await serverNoScoped.executeOperation({
      query: UPDATE_USER_INFO_DESCRIPTION,
      variables: { input: { description } },
    })
    expect(errors && errors.length).toBe(1)
    expect(errors && errors[0].message).toBeTruthy()

    // scoped
    const { server: serverScoped } = await prepare({
      email: defaultTestUser.email,
      mode: AUTH_MODE.oauth,
      scope: mutationScopes,
    })
    const { data } = await serverScoped.executeOperation({
      query: UPDATE_USER_INFO_DESCRIPTION,
      variables: { input: { description } },
    })
    expect(_.get(data, 'updateUserInfo.info.description')).toEqual(description)
  })

  test('level2 mutation', async () => {
    // scoped
    const content = 'test comment content'
    const { server: serverScoped } = await prepare({
      email: defaultTestUser.email,
      mode: AUTH_MODE.oauth,
      scope: mutationScopes,
    })
    const { data } = await serverScoped.executeOperation({
      query: CREATE_COMMENT,
      variables: { content },
    })
    expect(_.get(data, 'putComment.content')).toBe(content)

    // no scoped
    const prevCreatedCommentId = _.get(data, 'putComment.id')
    const { server: serverNoScoped } = await prepare({
      email: defaultTestUser.email,
      mode: AUTH_MODE.oauth,
      scope: mutationScopes, // scope can't collapse comment
    })
    const { errors } = await serverNoScoped.executeOperation({
      query: COLLAPSE_COMMENT,
      variables: { input: { id: prevCreatedCommentId } },
    })
    expect(errors && errors.length).toBe(1)
    expect(errors && errors[0].message).toBeTruthy()
  })

  test('level3 mutation', async () => {
    // scoped
    const { server: serverScoped } = await prepare({
      email: defaultTestUser.email,
      mode: AUTH_MODE.oauth,
      scope: mutationScopes,
    })
    const { data } = await serverScoped.executeOperation({
      query: CLEAR_SEARCH_HISTORY,
    })
    expect(data?.clearSearchHistory).toBeTruthy()

    // no scoped
    const { server: serverNoScoped } = await prepare({
      email: defaultTestUser.email,
      mode: AUTH_MODE.oauth,
      scope: mutationLevel3Scope, // level3 scope don't supports wildcard
    })
    const { errors } = await serverNoScoped.executeOperation({
      query: CLEAR_SEARCH_HISTORY,
    })
    expect(errors && errors.length).toBe(1)
    expect(errors && errors[0].message).toBeTruthy()
  })
})

/**
 * Check general viewer query and mutation are functional or not.
 *
 * mode: 'user'
 */
describe('General viewer query and mutation', () => {
  test('query with public and private fields', async () => {
    const { context, server } = await prepare({
      email: defaultTestUser.email,
    })
    const otherUserName = 'test2'
    const { data } = await server.executeOperation({
      query: VIEWER_SCOPED_PRIVATE,
      variables: { input: { userName: otherUserName } },
    })
    expect(_.get(data, 'viewer.displayName')).toBe(context.viewer.displayName)
    expect(_.get(data, 'viewer.info.email')).toBe(context.viewer.email)
    expect(_.get(data, 'user.displayName')).toBe(otherUserName)
  })

  test('query with private fields', async () => {
    const { server } = await prepare({ email: defaultTestUser.email })
    // query no scope field error
    const { data } = await server.executeOperation({
      query: VIEWER_NO_SCOPED_PRIVATE,
    })
    expect(_.get(data, 'viewer.settings.notification.mention')).toBe(true)

    // query other private field error
    const otherUserName = 'test2'
    const error_case = await server.executeOperation({
      query: VIEWER_SCOPED_WITH_OTHER_PRIVATE,
      variables: { input: { userName: otherUserName } },
    })
    expect(_.get(error_case, 'errors.length')).toBe(1)
    expect(_.get(error_case, 'errors.0.message')).toBeTruthy()
  })

  test('query nested other private fields', async () => {
    const { server } = await prepare({
      email: defaultTestUser.email,
    })
    const errorCase1 = await server.executeOperation({
      query: VIEWER_NESTED_OTHER_PARIVATE,
    })

    try {
      expect(errorCase1 && errorCase1.errors && errorCase1.errors.length).toBe(
        1
      )
      expect(
        errorCase1 && errorCase1.errors && errorCase1.errors[0].message
      ).toBeTruthy()
    } catch {
      const hasNoAuthors =
        _.get(errorCase1.data, 'viewer.recommendation.authors.edges', [])
          .length <= 0
      expect(hasNoAuthors).toBeTruthy()
    }
  })

  test('level1 mutation', async () => {
    const description = 'foo bar'
    const { server } = await prepare({ email: defaultTestUser.email })
    const { data } = await server.executeOperation({
      query: UPDATE_USER_INFO_DESCRIPTION,
      variables: { input: { description } },
    })
    expect(_.get(data, 'updateUserInfo.info.description')).toEqual(description)
  })

  test('level2 mutation', async () => {
    const content = 'test comment content'
    const { server } = await prepare({
      email: defaultTestUser.email,
    })
    const { data } = await server.executeOperation({
      query: CREATE_COMMENT,
      variables: { content },
    })
    expect(_.get(data, 'putComment.content')).toBe(content)
  })

  test('level3 mutation', async () => {
    const { server } = await prepare({
      email: defaultTestUser.email,
    })
    const { data } = await server.executeOperation({
      query: CLEAR_SEARCH_HISTORY,
    })
    expect(data?.clearSearchHistory).toBeTruthy()
  })
})

/**
 * Check admin viewer query and mutation are functional or not.
 *
 * mode: 'admin'
 */
describe('Admin viewer query and mutation', () => {
  test('query with public and private fields', async () => {
    const { context, server } = await prepare({
      email: adminUser.email,
    })
    const otherUserName = 'test2'
    const { data } = await server.executeOperation({
      query: VIEWER_SCOPED_PRIVATE,
      variables: { input: { userName: otherUserName } },
    })
    expect(_.get(data, 'viewer.displayName')).toBe(context.viewer.displayName)
    expect(_.get(data, 'viewer.info.email')).toBe(context.viewer.email)
    expect(_.get(data, 'user.displayName')).toBe(otherUserName)
  })

  test('query with private fields', async () => {
    const { server } = await prepare({ email: adminUser.email })

    // query no scope field error
    const { data } = await server.executeOperation({
      query: VIEWER_NO_SCOPED_PRIVATE,
    })
    expect(_.get(data, 'viewer.settings.notification.mention')).toBe(true)

    // query other private field error
    const otherUserName = 'test2'
    const { data: data2 } = await server.executeOperation({
      query: VIEWER_SCOPED_WITH_OTHER_PRIVATE,
      variables: { input: { userName: otherUserName } },
    })
    expect(_.get(data2, 'user.info.email')).toBe('test2@matters.news')
  })

  test('query nested other private fields', async () => {
    const { server } = await prepare({
      email: adminUser.email,
    })

    const { data } = await server.executeOperation({
      query: VIEWER_NESTED_OTHER_PARIVATE,
    })

    try {
      expect(
        _.get(data, 'viewer.recommendation.authors.edges.0.node.info.email')
      ).toBeTruthy()
    } catch {
      const hasNoAuthors =
        _.get(data, 'viewer.recommendation.authors.edges', []).length <= 0
      expect(hasNoAuthors).toBeTruthy()
    }
  })

  test('level1 mutation', async () => {
    const description = 'foo bar'
    const { server } = await prepare({ email: adminUser.email })
    const { data } = await server.executeOperation({
      query: UPDATE_USER_INFO_DESCRIPTION,
      variables: { input: { description } },
    })
    expect(_.get(data, 'updateUserInfo.info.description')).toEqual(description)
  })

  test('level2 mutation', async () => {
    const content = 'test comment content'
    const { server } = await prepare({
      email: adminUser.email,
    })
    const { data } = await server.executeOperation({
      query: CREATE_COMMENT,
      variables: { content },
    })
    expect(_.get(data, 'putComment.content')).toBe(content)
  })

  test('level3 mutation', async () => {
    const { server } = await prepare({
      email: adminUser.email,
    })
    const { data } = await server.executeOperation({
      query: CLEAR_SEARCH_HISTORY,
    })
    expect(data?.clearSearchHistory).toBeTruthy()
  })
})
