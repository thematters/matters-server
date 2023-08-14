import { Wallet } from 'ethers'
import _ from 'lodash'

import {
  AUTH_MODE,
  NODE_TYPES,
  SCOPE_PREFIX,
  VERIFICATION_CODE_STATUS,
  SIGNING_MESSAGE_PURPOSE,
} from 'common/enums'
import { toGlobalId } from 'common/utils'
import { UserService } from 'connectors'

import {
  adminUser,
  defaultTestUser,
  getUserContext,
  testClient,
} from '../utils'

const userService = new UserService()

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

const EMAIL_LOGIN = /* GraphQL */ `
  mutation ($input: EmailLoginInput!) {
    emailLogin(input: $input) {
      type
      auth
      user {
        userName
        info {
          email
          emailVerified
        }
      }
      token
    }
  }
`

const prepare = async ({
  email,
  mode,
  scope,
}: {
  email: string
  mode?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scope?: { [key: string]: any }
}) => {
  const context = await getUserContext({ email })
  // eslint-disable-next-line
  // @ts-ignore
  context.viewer.authMode = mode || context.viewer.role
  // eslint-disable-next-line
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
    const content = '<p>test comment content</p>'
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
    const content = '<p>test comment content</p>'
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
    const content = '<p>test comment content</p>'
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
    const content = '<p>test comment content</p>'
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

describe('emailLogin', () => {
  const newEmail1 = 'new1@matters.town'
  const newEmail2 = 'new2@matters.town'

  describe('register', () => {
    test('register email of existed user', async () => {
      const server = await testClient()
      const { errors } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: defaultTestUser.email,
            passwordOrCode: 'fake-code',
          },
        },
      })
      expect(errors?.[0].extensions.code).toBe('USER_PASSWORD_INVALID')

      const notVerifiedEmail = 'not-verified@matters.town'
      const user = await userService.create({
        email: notVerifiedEmail,
        emailVerified: false,
      })
      expect(user.emailVerified).toBe(false)

      const { errors: errors2 } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: notVerifiedEmail,
            passwordOrCode: 'fake-code',
          },
        },
      })
      expect(errors2?.[0].extensions.code).toBe('USER_PASSWORD_INVALID')
    })
    test('register with invalid code will fail', async () => {
      const server = await testClient()
      const { errors } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: newEmail1,
            passwordOrCode: 'fake-code',
          },
        },
      })
      expect(errors?.[0].extensions.code).toBe('CODE_INVALID')
    })
    test('register with expired code will fail', async () => {
      const code = await userService.createVerificationCode({
        email: newEmail1,
        type: 'register',
        expiredAt: new Date(Date.now() - 1000),
      })
      const server = await testClient()
      const { errors } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: newEmail1,
            passwordOrCode: code.code,
          },
        },
      })
      expect(errors?.[0].extensions.code).toBe('CODE_EXPIRED')
    })
    test('register with inactive code will fail', async () => {
      const code = await userService.createVerificationCode({
        email: newEmail1,
        type: 'register',
      })
      await userService.markVerificationCodeAs({
        codeId: code.id,
        status: VERIFICATION_CODE_STATUS.inactive,
      })

      const server = await testClient()
      const { errors } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: newEmail1,
            passwordOrCode: code.code,
          },
        },
      })
      expect(errors?.[0].extensions.code).toBe('CODE_INACTIVE')
    })
    test('register with used code will fail', async () => {
      const code = await userService.createVerificationCode({
        email: newEmail1,
        type: 'register',
      })
      await userService.markVerificationCodeAs({
        codeId: code.id,
        status: VERIFICATION_CODE_STATUS.used,
      })

      const server = await testClient()
      const { errors } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: newEmail1,
            passwordOrCode: code.code,
          },
        },
      })
      expect(errors?.[0].extensions.code).toBe('CODE_INACTIVE')
    })
    test('register with valid code will succeed', async () => {
      const code = await userService.createVerificationCode({
        email: newEmail1,
        type: 'register',
      })
      const server = await testClient()
      const { data } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: newEmail1,
            passwordOrCode: code.code,
          },
        },
      })
      expect(data?.emailLogin.auth).toBe(true)
      expect(data?.emailLogin.user.info.emailVerified).toBe(true)
    })
  })
  describe('passwd login', () => {
    test('login with wrong password will failed', async () => {
      const server = await testClient()
      const { errors } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: defaultTestUser.email,
            passwordOrCode: 'wrong-password',
          },
        },
      })
      expect(errors?.[0].extensions.code).toBe('USER_PASSWORD_INVALID')
    })
    test('login with correct password will succeed', async () => {
      const server = await testClient()
      const { data } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: defaultTestUser.email,
            passwordOrCode: '12345678',
          },
        },
      })
      expect(data?.emailLogin.auth).toBe(true)
      expect(data?.emailLogin.token).toBeDefined()
    })
  })
  describe('otp login', () => {
    test('login not existed user with OTP will register new user', async () => {
      const code = await userService.createVerificationCode({
        email: newEmail2,
        type: 'email_otp',
      })
      expect(code.status).toBe(VERIFICATION_CODE_STATUS.active)
      const server = await testClient()
      const { data } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: newEmail2,
            passwordOrCode: code.code,
          },
        },
      })
      expect(data?.emailLogin.auth).toBe(true)
      expect(data?.emailLogin.type).toBe('Signup')
      expect(data?.emailLogin.token).toBeDefined()
      expect(data?.emailLogin.user.info.emailVerified).toBe(true)

      const codes = await userService.findVerificationCodes({
        where: { email: newEmail2 },
      })
      for (const c of codes) {
        expect(c.status).not.toBe(VERIFICATION_CODE_STATUS.active)
      }
    })
    test('login existed user with OTP will login the user', async () => {
      const code = await userService.createVerificationCode({
        email: newEmail2,
        type: 'email_otp',
      })
      const server = await testClient()
      const { data } = await server.executeOperation({
        query: EMAIL_LOGIN,
        variables: {
          input: {
            email: newEmail2,
            passwordOrCode: code.code,
          },
        },
      })
      expect(data?.emailLogin.auth).toBe(true)
      expect(data?.emailLogin.type).toBe('Login')
      expect(data?.emailLogin.token).toBeDefined()
      expect(data?.emailLogin.user.info.emailVerified).toBe(true)

      const codes = await userService.findVerificationCodes({
        where: { email: newEmail2 },
      })
      for (const c of codes) {
        expect(c.status).not.toBe(VERIFICATION_CODE_STATUS.active)
      }
    })
  })
})

describe('setUseName', () => {
  const SET_USER_NAME = /* GraphQL */ `
    mutation ($input: SetUserNameInput!) {
      setUserName(input: $input) {
        userName
        displayName
      }
    }
  `
  let email: string
  beforeEach(async () => {
    email = `test-${Date.now()}@example.com`
    await userService.create({ email })
  })

  test('visitor can not call setUseName', async () => {
    const server = await testClient()
    const { errors } = await server.executeOperation({
      query: SET_USER_NAME,
      variables: {
        input: { userName: 'test' },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
  test('user having userName can not call setUseName', async () => {
    const server = await testClient({ isAuth: true, isMatty: true })
    const { errors } = await server.executeOperation({
      query: SET_USER_NAME,
      variables: {
        input: { userName: 'test' },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
  test('user can not set invalid userName', async () => {
    const { server } = await prepare({ email })
    const { errors } = await server.executeOperation({
      query: SET_USER_NAME,
      variables: {
        input: { userName: '#invalid@' },
      },
    })
    expect(errors?.[0].extensions.code).toBe('NAME_INVALID')
  })
  test('user can not set existed userName', async () => {
    const { server } = await prepare({ email })
    const { errors } = await server.executeOperation({
      query: SET_USER_NAME,
      variables: {
        input: { userName: 'matty' },
      },
    })
    expect(errors?.[0].extensions.code).toBe('NAME_INVALID')
  })
  test('succeed', async () => {
    const userName = 'noone'
    const { server } = await prepare({ email })
    const { data } = await server.executeOperation({
      query: SET_USER_NAME,
      variables: {
        input: { userName },
      },
    })
    expect(data?.setUserName.userName).toBe(userName)
    expect(data?.setUserName.displayName).toBeDefined()
  })
})

describe('walletLogin', () => {
  const GENERATE_SIGNING_MESSAGE = /* GraphQL */ `
    mutation ($input: GenerateSigningMessageInput!) {
      generateSigningMessage(input: $input) {
        nonce
        purpose
        signingMessage
        createdAt
        expiredAt
      }
    }
  `
  const WALLET_LOGIN = /* GraphQL */ `
    mutation ($input: WalletLoginInput!) {
      walletLogin(input: $input) {
        auth
        token
        type
        user {
          userName
          info {
            ethAddress
          }
        }
      }
    }
  `
  test('wallet signup/login', async () => {
    const testWalletLoginPurpose = async (
      purpose: keyof typeof SIGNING_MESSAGE_PURPOSE
    ) => {
      const wallet = Wallet.createRandom()
      const server = await testClient()
      // signup
      const {
        data: {
          generateSigningMessage: { nonce, signingMessage },
        },
      } = await server.executeOperation({
        query: GENERATE_SIGNING_MESSAGE,
        variables: {
          input: {
            address: wallet.address,
            purpose,
          },
        },
      })
      const signature = await wallet.signMessage(signingMessage)
      const { data } = await server.executeOperation({
        query: WALLET_LOGIN,
        variables: {
          input: {
            ethAddress: wallet.address,
            signedMessage: signingMessage,
            signature,
            nonce,
          },
        },
      })
      expect(data?.walletLogin.auth).toBe(true)
      expect(data?.walletLogin.token).toBeDefined()
      expect(data?.walletLogin.type).toBe('Signup')
      expect(data?.walletLogin.user.userName).toBe(null)
      expect(data?.walletLogin.user.info.ethAddress).toBe(
        wallet.address.toLowerCase()
      )
      // login
      const {
        data: {
          generateSigningMessage: {
            nonce: loginNonce,
            signingMessage: loginSigningMessage,
          },
        },
      } = await server.executeOperation({
        query: GENERATE_SIGNING_MESSAGE,
        variables: {
          input: {
            address: wallet.address,
            purpose,
          },
        },
      })
      const loginSignature = await wallet.signMessage(loginSigningMessage)
      const { data: loginData } = await server.executeOperation({
        query: WALLET_LOGIN,
        variables: {
          input: {
            ethAddress: wallet.address,
            signedMessage: loginSigningMessage,
            signature: loginSignature,
            nonce: loginNonce,
          },
        },
      })
      expect(loginData?.walletLogin.auth).toBe(true)
      expect(loginData?.walletLogin.token).toBeDefined()
      expect(loginData?.walletLogin.type).toBe('Login')
      expect(loginData?.walletLogin.user.userName).toBe(null)
      expect(loginData?.walletLogin.user.info.ethAddress).toBe(
        wallet.address.toLowerCase()
      )
    }

    await testWalletLoginPurpose(SIGNING_MESSAGE_PURPOSE.signup)
    await testWalletLoginPurpose(SIGNING_MESSAGE_PURPOSE.login)
  }, 100000)
  test('wallet login with wrong purpose will throw errors', async () => {
    const wallet = Wallet.createRandom()
    const server = await testClient()
    const {
      data: {
        generateSigningMessage: { nonce, signingMessage },
      },
    } = await server.executeOperation({
      query: GENERATE_SIGNING_MESSAGE,
      variables: {
        input: {
          address: wallet.address,
          purpose: SIGNING_MESSAGE_PURPOSE.airdrop,
        },
      },
    })
    const signature = await wallet.signMessage(signingMessage)
    const { errors } = await server.executeOperation({
      query: WALLET_LOGIN,
      variables: {
        input: {
          ethAddress: wallet.address,
          signedMessage: signingMessage,
          signature,
          nonce,
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })
  test('wallet login with wrong nonce will throw errors', async () => {
    const wallet = Wallet.createRandom()
    const server = await testClient()
    const {
      data: {
        generateSigningMessage: { nonce, signingMessage },
      },
    } = await server.executeOperation({
      query: GENERATE_SIGNING_MESSAGE,
      variables: {
        input: {
          address: wallet.address,
          purpose: SIGNING_MESSAGE_PURPOSE.signup,
        },
      },
    })
    const signature = await wallet.signMessage(signingMessage)
    const { errors } = await server.executeOperation({
      query: WALLET_LOGIN,
      variables: {
        input: {
          ethAddress: wallet.address,
          signedMessage: signingMessage,
          signature,
          nonce: nonce + 'wrong',
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })
  test('wallet login check nonce in signature', async () => {
    const wallet = Wallet.createRandom()
    const server = await testClient()
    const {
      data: {
        generateSigningMessage: { nonce: nonce, signingMessage },
      },
    } = await server.executeOperation({
      query: GENERATE_SIGNING_MESSAGE,
      variables: {
        input: {
          address: wallet.address,
          purpose: SIGNING_MESSAGE_PURPOSE.signup,
        },
      },
    })
    const signature = await wallet.signMessage(
      signingMessage.replace(nonce, 'wrongnonce')
    )
    const { errors } = await server.executeOperation({
      query: WALLET_LOGIN,
      variables: {
        input: {
          ethAddress: wallet.address,
          signedMessage: signingMessage,
          signature,
          nonce: nonce,
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })
})
