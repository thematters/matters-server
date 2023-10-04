import type { Connections } from 'definitions'
import type { Knex } from 'knex'

import _get from 'lodash/get'

import {
  MATERIALIZED_VIEW,
  NODE_TYPES,
  PAYMENT_CURRENCY,
  RESERVED_NAMES,
  USER_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  VERIFICATION_CODE_STATUS,
} from 'common/enums'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { refreshView, UserService, PaymentService } from 'connectors'

import { createDonationTx, createTx } from '../../../connectors/__test__/utils'
import {
  defaultTestUser,
  getUserContext,
  registerUser,
  testClient,
  updateUserState,
  genConnections,
  closeConnections,
} from '../utils'

let connections: Connections
let userService: UserService
let paymentService: PaymentService

beforeAll(async () => {
  connections = await genConnections()
  userService = new UserService(connections)
  paymentService = new PaymentService(connections)
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

const USER_LOGIN = /* GraphQL */ `
  mutation UserLogin($input: UserLoginInput!) {
    userLogin(input: $input) {
      auth
      token
    }
  }
`

const TOGGLE_FOLLOW_USER = /* GraphQL */ `
  mutation ($input: ToggleItemInput!) {
    toggleFollowUser(input: $input) {
      id
      isFollowee
    }
  }
`

const TOGGLE_BLOCK_USER = /* GraphQL */ `
  mutation ($input: ToggleItemInput!) {
    toggleBlockUser(input: $input) {
      id
      isBlocked
    }
  }
`

const UPDATE_USER_INFO = /* GraphQL */ `
  mutation UpdateUserInfo($input: UpdateUserInfoInput!) {
    updateUserInfo(input: $input) {
      id
      userName
      displayName
      avatar
      info {
        description
      }
    }
  }
`

const UPDATE_NOTIFICARION_SETTINGS = /* GraphQL */ `
  mutation UpdateNotificationSetting($input: UpdateNotificationSettingInput!) {
    updateNotificationSetting(input: $input) {
      settings {
        notification {
          userNewFollower
        }
      }
    }
  }
`
const SET_CURRENCY = /* GraphQL */ `
  mutation SetCurrency($input: SetCurrencyInput!) {
    setCurrency(input: $input) {
      settings {
        currency
      }
    }
  }
`

const GET_USER_READ_HISTORY = /* GraphQL */ `
  query {
    viewer {
      id
      activity {
        history(input: { first: 0 }) {
          totalCount
        }
      }
    }
  }
`
const CLEAR_READ_HISTORY = /* GraphQL */ `
  mutation ClearReadHistory($input: ClearReadHistoryInput!) {
    clearReadHistory(input: $input) {
      id
      activity {
        history(input: { first: 0 }) {
          totalCount
        }
      }
    }
  }
`

const GET_USER_BY_USERNAME = /* GraphQL */ `
  query ($input: UserInput!) {
    user(input: $input) {
      id
      userName
      likerId
    }
  }
`

const GET_VIEWER_INFO = /* GraphQL */ `
  query {
    viewer {
      id
      avatar
      displayName
      info {
        email
        description
        createdAt
        agreeOn
      }
      status {
        state
      }
    }
  }
`
const GET_VIEW_ARTICLES = /* GraphQL */ `
  query ($input: ConnectionArgs!) {
    viewer {
      id
      articles(input: $input) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`
const GET_VIEWER_SETTINGS = /* GraphQL */ `
  query {
    viewer {
      id
      settings {
        language
        currency
        notification {
          userNewFollower
        }
      }
    }
  }
`

const GET_VIEWER_SUBSCRIPTIONS = /* GraphQL */ `
  query ($input: ConnectionArgs!) {
    viewer {
      subscriptions(input: $input) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`
const GET_VIEWER_FOLLOWERS = /* GraphQL */ `
  query ($input: ConnectionArgs!) {
    viewer {
      followers(input: $input) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`
const GET_VIEWER_FOLLOWEES = /* GraphQL */ `
  query ($input: ConnectionArgs!) {
    viewer {
      following {
        users(input: $input) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  }
`
const GET_VIEWER_FOLLOWINGS = /* GraphQL */ `
  query ($input: ConnectionArgs!) {
    viewer {
      following {
        circles(input: $input) {
          edges {
            node {
              id
            }
          }
        }
        tags(input: $input) {
          edges {
            node {
              id
            }
          }
        }
        users(input: $input) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  }
`
const GET_VIEWER_TOPDONATORS = /* GraphQL */ `
  query ($input: TopDonatorInput!) {
    viewer {
      analytics {
        topDonators(input: $input) {
          edges {
            node {
              userName
            }
            donationCount
          }
          totalCount
        }
      }
    }
  }
`

const GET_VIEWER_RECOMMENDATION = (list: string) => /* GraphQL */ `
query($input: ConnectionArgs!) {
  viewer {
    recommendation {
      ${list}(input: $input) {
        totalCount
        edges {
          node {
            ...on Article {
              id
              author {
                id
              }
            }
          }
        }
      }
    }
  }
}
`

const GET_VIEWER_RECOMMENDATION_TAGS = /* GraphQL */ `
  query ($input: RecommendInput!) {
    viewer {
      recommendation {
        tags(input: $input) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  }
`

const GET_AUTHOR_RECOMMENDATION = (list: string) => /* GraphQL */ `
  query($input: RecommendInput!) {
    viewer {
      recommendation {
        ${list}(input: $input) {
          edges {
            node {
              id
          }
        }
      }
    }
  }
}
`

const GET_VIEWER_BADGES = /* GraphQL */ `
  query {
    viewer {
      info {
        badges {
          type
        }
      }
    }
  }
`

const GET_VIEWER_TOPICS = /* GraphQL */ `
  query {
    viewer {
      topics(input: { first: 10 }) {
        totalCount
        edges {
          node {
            id
            cover
            author {
              id
            }
            chapterCount
            articleCount
            chapters {
              id
              articles {
                id
              }
            }
            articles {
              id
            }
            public
          }
        }
      }
    }
  }
`

const GET_VIEWER_WALLET_TRANSACTIONS = /* GraphQL */ `
  query ($input: TransactionsArgs!) {
    viewer {
      wallet {
        transactions(input: $input) {
          edges {
            node {
              id
              state
              purpose
              currency
            }
          }
        }
      }
    }
  }
`

const PUT_TOPIC = /* GraphQL */ `
  mutation PutTopic($input: PutTopicInput!) {
    putTopic(input: $input) {
      id
      title
      articles {
        id
      }
    }
  }
`

const PUT_CHAPTER = /* GraphQL */ `
  mutation PutChapter($input: PutChapterInput!) {
    putChapter(input: $input) {
      id
      title
      articles {
        id
      }
    }
  }
`

const DELETE_TOPICS = /* GraphQL */ `
  mutation DeleteTopics($input: DeleteTopicsInput!) {
    deleteTopics(input: $input)
  }
`

const SORT_TOPICS = /* GraphQL */ `
  mutation SortTopics($input: SortTopicsInput!) {
    sortTopics(input: $input) {
      id
    }
  }
`

const SEND_VERIFICATION_CODE = /* GraphQL */ `
  mutation SendVerificationCode($input: SendVerificationCodeInput!) {
    sendVerificationCode(input: $input)
  }
`
const CONFIRM_VERIFICATION_CODE = /* GraphQL */ `
  mutation ConfirmVerificationCode($input: ConfirmVerificationCodeInput!) {
    confirmVerificationCode(input: $input)
  }
`

const RESET_USER_LIKER_ID = /* GraphQL */ `
  mutation ResetLikerId($input: ResetLikerIdInput!) {
    resetLikerId(input: $input) {
      id
      likerId
    }
  }
`

const RESET_USER_WALLET = /* GraphQL */ `
  mutation ResetWallet($input: ResetWalletInput!) {
    resetWallet(input: $input) {
      id
      info {
        ethAddress
      }
    }
  }
`

describe('register and login functionarlities', () => {
  test('register user and retrieve info', async () => {
    const email = `test-${Math.floor(Math.random() * 100)}@matters.news`
    const code = await userService.createVerificationCode({
      type: 'register',
      email,
    })
    await userService.markVerificationCodeAs({
      codeId: code.id,
      status: VERIFICATION_CODE_STATUS.verified,
    })
    const user = {
      email,
      displayName: 'testUser',
      password: 'Abcd1234',
      codeId: code.uuid,
    }
    const registerResult = await registerUser(user, connections)
    expect(_get(registerResult, 'data.userRegister.token')).toBeTruthy()

    const context = await getUserContext({ email: user.email }, connections)
    const server = await testClient({
      context,
      connections,
    })
    const newUserResult = await server.executeOperation({
      query: GET_VIEWER_INFO,
    })
    const displayName = _get(newUserResult, 'data.viewer.displayName')
    const info = newUserResult!.data!.viewer.info
    expect(displayName).toBe(user.displayName)
    expect(info.email).toBe(user.email)

    const status = newUserResult!.data!.viewer.status
    expect(status.state).toBe(USER_STATE.active)
  })

  test('auth fail when password is incorrect', async () => {
    const email = 'test1@matters.news'
    const password = 'wrongPassword'
    const server = await testClient({ connections })

    const result = await server.executeOperation({
      query: USER_LOGIN,
      variables: { input: { email, password } },
    })
    expect(_get(result, 'errors.0.extensions.code')).toBe(
      'USER_PASSWORD_INVALID'
    )
  })

  test('auth success when password is correct', async () => {
    const email = 'test1@matters.news'
    const password = '12345678'

    const server = await testClient({ connections })
    const result = await server.executeOperation({
      query: USER_LOGIN,
      variables: { input: { email, password } },
    })
    expect(_get(result, 'data.userLogin.auth')).toBe(true)
  })

  test('retrive user info after login', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_INFO,
    })
    const info = _get(data, 'viewer.info')
    expect(info.email).toEqual(defaultTestUser.email)
  })
})

describe('user query fields', () => {
  test('get user by username', async () => {
    const userName = 'test1'
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: GET_USER_BY_USERNAME,
      variables: { input: { userName } },
    })
    expect(_get(data, 'user.userName')).toBe(userName)
  })
  test('retrive user articles', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const result = await server.executeOperation({
      query: GET_VIEW_ARTICLES,
      variables: { input: { first: 1 } },
    })
    const { data } = result
    const articles = _get(data, 'viewer.articles.edges')
    expect(articles.length).toBeDefined()
    expect(articles[0].node.id).toBeDefined()
  })

  test('retrive UserSettings by visitors', async () => {
    const server = await testClient({ connections })
    const res = await server.executeOperation({
      query: GET_VIEWER_SETTINGS,
    })
    const { data } = res
    const settings = _get(data, 'viewer.settings')
    expect(settings.language).toBe('en')
    expect(settings.currency).toBe('USD')
    expect(settings.notification).toBeNull()
  })

  test('retrive UserSettings', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const res = await server.executeOperation({
      query: GET_VIEWER_SETTINGS,
    })
    const { data } = res
    const settings = _get(data, 'viewer.settings')
    expect(settings).toBeDefined()
    expect(settings.language).toBe('zh_hant')
    expect(settings.currency).toBe('USD')
    expect(settings.notification).toBeDefined()
  })

  test('retrive subscriptions', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_SUBSCRIPTIONS,
      variables: { input: {} },
    })
    const subscriptions = _get(data, 'viewer.subscriptions.edges')
    expect(subscriptions.length).toBeTruthy()
  })

  test('retrive followers', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_FOLLOWERS,
      variables: { input: {} },
    })
    const followers = _get(data, 'viewer.followers.edges')
    expect(followers).toBeDefined()
  })

  test('retrive followees', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_FOLLOWEES,
      variables: { input: {} },
    })
    const followees = _get(data, 'viewer.following.users.edges')
    expect(followees.length).toBeTruthy()
  })

  test('retrive following', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_FOLLOWINGS,
      variables: { input: {} },
    })
    const circles = _get(data, 'viewer.following.circles.edges')
    const users = _get(data, 'viewer.following.users.edges')
    const tags = _get(data, 'viewer.following.tags.edges')
    expect(Array.isArray(circles)).toBe(true)
    expect(Array.isArray(users)).toBe(true)
    expect(Array.isArray(tags)).toBe(true)
  })

  test('retrive topDonators by visitor', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })
    const donators = _get(data, 'viewer.analytics.topDonators')
    expect(donators).toEqual({ edges: [], totalCount: 0 })
  })

  test.skip('retrive topDonators by user', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const recipientId = '1'
    // test no donators
    const res1 = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })
    const donators1 = _get(res1, 'data.viewer.analytics.topDonators')
    expect(donators1).toEqual({ edges: [], totalCount: 0 })

    // test having donators
    await createDonationTx({ recipientId, senderId: '2' }, paymentService)
    const res2 = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })
    const donators2 = _get(res2, 'data.viewer.analytics.topDonators')
    expect(donators2).toEqual({
      edges: [{ node: { userName: 'test2' }, donationCount: 1 }],
      totalCount: 1,
    })

    // test pagination
    await createDonationTx({ recipientId, senderId: '3' }, paymentService)
    const res3 = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: { first: 1 } },
    })
    const donators3 = _get(res3, 'data.viewer.analytics.topDonators')
    expect(donators3).toEqual({
      edges: [{ node: { userName: 'test3' }, donationCount: 1 }],
      totalCount: 2,
    })
  })
  test('retrive wallet transactions', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const recipientId = '1'
    const senderId = '2'
    const succeededHKDSubscriptionSplitTx = await createTx(
      {
        senderId,
        recipientId,
        purpose: TRANSACTION_PURPOSE.subscriptionSplit,
        currency: PAYMENT_CURRENCY.HKD,
        state: TRANSACTION_STATE.succeeded,
      },
      paymentService
    )
    const failedUSDTdonationTx = await createTx(
      {
        senderId,
        recipientId,
        purpose: TRANSACTION_PURPOSE.donation,
        currency: PAYMENT_CURRENCY.USDT,
        state: TRANSACTION_STATE.failed,
      },
      paymentService
    )
    const canceledLIKEdonationTx = await createTx(
      {
        senderId,
        recipientId,
        purpose: TRANSACTION_PURPOSE.donation,
        currency: PAYMENT_CURRENCY.LIKE,
        state: TRANSACTION_STATE.canceled,
      },
      paymentService
    )

    const toGlobalTxId = (id: string) =>
      toGlobalId({ type: NODE_TYPES.Transaction, id })
    const checkContains = (res: any, tx: any) =>
      expect(
        _get(res, 'data.viewer.wallet.transactions.edges').map(
          (e: any) => e.node.id
        )
      ).toContain(toGlobalTxId(tx.id))
    const checkNotContains = (res: any, tx: any) =>
      expect(
        _get(res, 'data.viewer.wallet.transactions.edges').map(
          (e: any) => e.node.id
        )
      ).not.toContain(toGlobalTxId(tx.id))

    const allRes = await server.executeOperation({
      query: GET_VIEWER_WALLET_TRANSACTIONS,
      variables: { input: {} },
    })
    checkContains(allRes, succeededHKDSubscriptionSplitTx)
    checkContains(allRes, failedUSDTdonationTx)
    checkNotContains(allRes, canceledLIKEdonationTx)

    // id

    const deprecatedIdRes = await server.executeOperation({
      query: GET_VIEWER_WALLET_TRANSACTIONS,
      variables: {
        input: { id: toGlobalTxId(succeededHKDSubscriptionSplitTx.id) },
      },
    })
    checkContains(deprecatedIdRes, succeededHKDSubscriptionSplitTx)
    checkNotContains(deprecatedIdRes, failedUSDTdonationTx)
    checkNotContains(deprecatedIdRes, canceledLIKEdonationTx)

    const idRes = await server.executeOperation({
      query: GET_VIEWER_WALLET_TRANSACTIONS,
      variables: {
        input: {
          filter: { id: toGlobalTxId(succeededHKDSubscriptionSplitTx.id) },
        },
      },
    })
    checkContains(idRes, succeededHKDSubscriptionSplitTx)
    checkNotContains(idRes, failedUSDTdonationTx)
    checkNotContains(idRes, canceledLIKEdonationTx)

    // states

    const deprecatedStatesRes = await server.executeOperation({
      query: GET_VIEWER_WALLET_TRANSACTIONS,
      variables: { input: { states: ['succeeded'] } },
    })
    checkContains(deprecatedStatesRes, succeededHKDSubscriptionSplitTx)
    checkNotContains(deprecatedStatesRes, failedUSDTdonationTx)
    checkNotContains(deprecatedStatesRes, canceledLIKEdonationTx)

    const statesRes = await server.executeOperation({
      query: GET_VIEWER_WALLET_TRANSACTIONS,
      variables: { input: { filter: { states: ['succeeded'] } } },
    })
    checkContains(statesRes, succeededHKDSubscriptionSplitTx)
    checkNotContains(statesRes, failedUSDTdonationTx)
    checkNotContains(statesRes, canceledLIKEdonationTx)

    // purpose

    const purposeRes = await server.executeOperation({
      query: GET_VIEWER_WALLET_TRANSACTIONS,
      variables: { input: { filter: { purpose: 'subscriptionSplit' } } },
    })
    checkContains(purposeRes, succeededHKDSubscriptionSplitTx)
    checkNotContains(purposeRes, failedUSDTdonationTx)
    checkNotContains(purposeRes, canceledLIKEdonationTx)
    const purposeRes2 = await server.executeOperation({
      query: GET_VIEWER_WALLET_TRANSACTIONS,
      variables: {
        input: { filter: { purpose: TRANSACTION_PURPOSE.donation } },
      },
    })
    checkNotContains(purposeRes2, succeededHKDSubscriptionSplitTx)
    checkContains(purposeRes2, failedUSDTdonationTx)
    checkNotContains(purposeRes2, canceledLIKEdonationTx)

    // currency

    const currencyRes = await server.executeOperation({
      query: GET_VIEWER_WALLET_TRANSACTIONS,
      variables: { input: { filter: { currency: PAYMENT_CURRENCY.HKD } } },
    })
    checkContains(currencyRes, succeededHKDSubscriptionSplitTx)
    checkNotContains(currencyRes, failedUSDTdonationTx)
    checkNotContains(currencyRes, canceledLIKEdonationTx)
    const currencyRes2 = await server.executeOperation({
      query: GET_VIEWER_WALLET_TRANSACTIONS,
      variables: { input: { filter: { currency: PAYMENT_CURRENCY.USDT } } },
    })
    checkNotContains(currencyRes2, succeededHKDSubscriptionSplitTx)
    checkContains(currencyRes2, failedUSDTdonationTx)
    checkNotContains(currencyRes2, canceledLIKEdonationTx)
    // canceled like txs was exclued
    const currencyRes3 = await server.executeOperation({
      query: GET_VIEWER_WALLET_TRANSACTIONS,
      variables: { input: { filter: { currency: PAYMENT_CURRENCY.LIKE } } },
    })
    checkNotContains(currencyRes3, succeededHKDSubscriptionSplitTx)
    checkNotContains(currencyRes3, failedUSDTdonationTx)
    checkNotContains(currencyRes3, canceledLIKEdonationTx)
  })
})

describe('mutations on User object', () => {
  test('follow a user with `toggleFollowUser`', async () => {
    const followeeId = toGlobalId({ type: NODE_TYPES.User, id: '4' })
    const server = await testClient({ isAuth: true, connections })
    const result = await server.executeOperation({
      query: TOGGLE_FOLLOW_USER,
      variables: {
        input: {
          id: followeeId,
          enabled: true,
        },
      },
    })
    expect(_get(result.data, 'toggleFollowUser.isFollowee')).toBe(true)
  })

  test('unfollow a user with `toggleFollowUser`', async () => {
    const followeeId = toGlobalId({ type: NODE_TYPES.User, id: '4' })
    const server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: TOGGLE_FOLLOW_USER,
      variables: {
        input: {
          id: followeeId,
          enabled: false,
        },
      },
    })
    expect(_get(data, 'toggleFollowUser.isFollowee')).toBe(false)
  })

  test('block a user with `toggleBlockUser`', async () => {
    const blockUserId = toGlobalId({ type: NODE_TYPES.User, id: '2' })
    const server = await testClient({ isAuth: true, connections })
    const result = await server.executeOperation({
      query: TOGGLE_BLOCK_USER,
      variables: {
        input: {
          id: blockUserId,
          enabled: true,
        },
      },
    })
    expect(_get(result.data, 'toggleBlockUser.isBlocked')).toBe(true)
  })

  test('block a user with `toggleBlockUser`', async () => {
    const blockUserId = toGlobalId({ type: NODE_TYPES.User, id: '2' })
    const server = await testClient({ isAuth: true, connections })
    const result = await server.executeOperation({
      query: TOGGLE_BLOCK_USER,
      variables: {
        input: {
          id: blockUserId,
          enabled: false,
        },
      },
    })
    expect(_get(result.data, 'toggleBlockUser.isBlocked')).toBe(false)
  })

  test('updateUserInfoDisplayName', async () => {
    // user can change its display name
    const displayName = 'abc2244'
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: UPDATE_USER_INFO,
      variables: { input: { displayName } },
    })
    expect(_get(data, 'updateUserInfo.displayName')).toEqual(displayName)

    // user cannnot use reserved name
    const userReservedNameResult = await server.executeOperation({
      query: UPDATE_USER_INFO,
      variables: { input: { displayName: RESERVED_NAMES[0] } },
    })
    expect(_get(userReservedNameResult, 'errors.0.extensions.code')).toBe(
      'DISPLAYNAME_INVALID'
    )

    // admin can use reserved name
    const adminServer = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const { data: adminReservedNameData } = await adminServer.executeOperation({
      query: UPDATE_USER_INFO,
      variables: { input: { displayName: RESERVED_NAMES[0] } },
    })
    const adminReservedNameDisplayName = _get(
      adminReservedNameData,
      'updateUserInfo.displayName'
    )
    expect(adminReservedNameDisplayName).toEqual(RESERVED_NAMES[0])
  })

  test('updateUserInfoUserName', async () => {
    const server = await testClient({ isAuth: true, connections })

    const userName2 = 'UPPERTest'
    const { data } = await server.executeOperation({
      query: UPDATE_USER_INFO,
      variables: { input: { userName: userName2 } },
    })
    expect(_get(data, 'updateUserInfo.userName')).toEqual(
      userName2.toLowerCase()
    )
  })

  test('updateUserInfoDescription', async () => {
    const description = 'foo bar'
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: UPDATE_USER_INFO,
      variables: { input: { description } },
    })
    const info = _get(data, 'updateUserInfo.info')
    expect(info.description).toEqual(description)
  })

  test('updateUserInfoAvatar', async () => {
    const avatarAssetUUID = '00000000-0000-0000-0000-000000000001'
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: UPDATE_USER_INFO,
      variables: { input: { avatar: avatarAssetUUID } },
    })
    const avatar = _get(data, 'updateUserInfo.avatar')
    expect(avatar).toEqual(expect.stringContaining('path/to/file.jpg'))
  })

  test('updateNotificationSetting', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: UPDATE_NOTIFICARION_SETTINGS,
      variables: { input: { type: 'userNewFollower', enabled: false } },
    })
    const enable = _get(
      data,
      'updateNotificationSetting.settings.notification.userNewFollower'
    )
    expect(enable).toBe(false)
  })

  test('setCurrency', async () => {
    // visitor can not set currency
    const visitorServer = await testClient({ connections })
    const { errors } = await visitorServer.executeOperation({
      query: SET_CURRENCY,
      variables: { input: { currency: 'USD' } },
    })
    expect(errors).toBeDefined()

    // user can set currency
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: SET_CURRENCY,
      variables: { input: { currency: 'USD' } },
    })
    expect(data!.setCurrency.settings.currency).toBe('USD')
  })

  test('read history', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })

    // check read history
    const { data } = await server.executeOperation({
      query: GET_USER_READ_HISTORY,
    })
    expect(_get(data, 'viewer.activity.history.totalCount')).toBe(1)

    // clear read history
    const clearResult = await server.executeOperation({
      query: CLEAR_READ_HISTORY,
      variables: { input: {} },
    })
    expect(
      _get(clearResult, 'data.clearReadHistory.activity.history.totalCount')
    ).toBe(0)
  })
})

describe('user recommendations', () => {
  let knex: Knex
  beforeAll(async () => {
    knex = connections.knex
  })
  test('retrieve articles from hottest, newest and icymi', async () => {
    await refreshView(MATERIALIZED_VIEW.article_hottest_materialized, knex)

    const lists = ['hottest', 'newest', 'icymi']
    for (const list of lists) {
      const serverNew = await testClient({
        isAuth: true,
        connections,
      })

      const result = await serverNew.executeOperation({
        query: GET_VIEWER_RECOMMENDATION(list),
        variables: { input: { first: 1 } },
      })
      const { data } = result
      const article = _get(data, `viewer.recommendation.${list}.edges.0.node`)
      expect(fromGlobalId(article.id).type).toBe('Article')
      const count = _get(data, `viewer.recommendation.${list}.totalCount`)
      expect(count).toBeGreaterThan(0)
    }
  })

  test('retrieve tags from tags', async () => {
    await refreshView(MATERIALIZED_VIEW.curation_tag_materialized, knex)
    await refreshView(MATERIALIZED_VIEW.tag_count_materialized, knex)

    const serverNew = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await serverNew.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_TAGS,
      variables: { input: { first: 1 } },
    })
    const tag = _get(data, 'viewer.recommendation.tags.edges.0.node')
    if (tag) {
      expect(fromGlobalId(tag.id).type).toBe('Tag')
    }
  })

  test('retrive users from authors', async () => {
    await refreshView(MATERIALIZED_VIEW.user_reader_materialized, knex)

    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_AUTHOR_RECOMMENDATION('authors'),
      variables: { input: { first: 1 } },
    })
    const author = _get(data, 'viewer.recommendation.authors.edges.0.node')
    expect(fromGlobalId(author.id).type).toBe('User')
  })

  test('articleHottest restricted authors not show in hottest', async () => {
    const getAuthorIds = (data: any) =>
      data!
        .viewer!.recommendation!.hottest!.edges.map(
          ({
            node: {
              author: { id },
            },
          }: {
            node: { author: { id: string } }
          }) => id
        )
        .map((id: string) => fromGlobalId(id).id)

    await refreshView(MATERIALIZED_VIEW.article_hottest_materialized, knex)
    // before restricted
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data: data1 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION('hottest'),
      variables: { input: { first: 10 } },
    })
    const authorIdsBefore = getAuthorIds(data1)

    const restrictedUserId = '1'
    expect(authorIdsBefore).toContain(restrictedUserId)

    // after restricted
    await userService.addRestriction('1', 'articleHottest')

    const { data: data2 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION('hottest'),
      variables: { input: { first: 10 } },
    })
    const authorIdsAfter = getAuthorIds(data2)
    expect(authorIdsAfter).not.toContain(restrictedUserId)
  })

  test('articleNewest restricted authors not show in newest', async () => {
    const getAuthorIds = (data: any) =>
      data!
        .viewer!.recommendation!.newest!.edges.map(
          ({
            node: {
              author: { id },
            },
          }: {
            node: { author: { id: string } }
          }) => id
        )
        .map((id: string) => fromGlobalId(id).id)

    // before restricted
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data: data1 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION('newest'),
      variables: { input: { first: 10 } },
    })
    const authorIdsBefore = getAuthorIds(data1)

    const restrictedUserId = '1'
    expect(authorIdsBefore).toContain(restrictedUserId)

    // after restricted
    await userService.addRestriction('1', 'articleNewest')

    const { data: data2 } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION('newest'),
      variables: { input: { first: 10 } },
    })
    const authorIdsAfter = getAuthorIds(data2)
    expect(authorIdsAfter).not.toContain(restrictedUserId)
  })
})

describe('badges', () => {
  test('get user badges', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_BADGES,
      variables: {},
    })
    expect(_get(data, 'viewer.info.badges.0.type')).toBe('seed')
  })
})

describe('verification code', () => {
  const email = `verification-${Math.floor(Math.random() * 100)}@test.com`
  const type = 'register'

  test('verified code', async () => {
    // get multi active codes
    const server = await testClient({ connections })
    const { data: data1 } = await server.executeOperation({
      query: SEND_VERIFICATION_CODE,
      variables: { input: { type, email, token: 'some-test-token' } },
    })
    const { data: data2 } = await server.executeOperation({
      query: SEND_VERIFICATION_CODE,
      variables: { input: { type, email, token: 'some-test-token' } },
    })
    expect(data1!.sendVerificationCode).toBe(true)
    expect(data2!.sendVerificationCode).toBe(true)

    const codes = await userService.findVerificationCodes({ where: { email } })
    expect(codes?.length).toBe(2)
    for (const code of codes) {
      expect(code.status).toBe(VERIFICATION_CODE_STATUS.active)
    }
    expect(codes[0].code !== codes[1].code).toBeTruthy()

    // confirm
    const serverMutate = await testClient({ connections })
    const confirmedResult = await serverMutate.executeOperation({
      query: CONFIRM_VERIFICATION_CODE,
      variables: { input: { type, email, code: codes[0].code } },
    })
    expect(
      confirmedResult &&
        confirmedResult.data &&
        confirmedResult.data.confirmVerificationCode
    ).toBe(codes[0].uuid)
    const [confirmedCode, inactiveCode] =
      await userService.findVerificationCodes({ where: { email } })
    expect(confirmedCode.status).toBe(VERIFICATION_CODE_STATUS.verified)
    expect(inactiveCode.status).toBe(VERIFICATION_CODE_STATUS.inactive)
  })

  test('inactive code', async () => {
    // send
    const server = await testClient({ connections })
    const result = await server.executeOperation({
      query: SEND_VERIFICATION_CODE,
      variables: { input: { type, email, token: 'some-test-token' } },
    })
    expect(result && result.data && result.data.sendVerificationCode).toBe(true)

    const codes = await userService.findVerificationCodes({ where: { email } })
    const code = codes?.length > 0 ? codes[0] : {}
    expect(code.status).toBe(VERIFICATION_CODE_STATUS.active)

    // mark it as inactive
    await userService.markVerificationCodeAs({
      codeId: code.id,
      status: VERIFICATION_CODE_STATUS.inactive,
    })

    // confirm
    const serverMutate = await testClient({ connections })
    const confirmedResult = await serverMutate.executeOperation({
      query: CONFIRM_VERIFICATION_CODE,
      variables: { input: { type, email, code: code.code } },
    })
    expect(_get(confirmedResult, 'errors.0.extensions.code')).toBe(
      'CODE_INACTIVE'
    )
  })

  test('expired code', async () => {
    // send
    const server = await testClient({ connections })
    const result = await server.executeOperation({
      query: SEND_VERIFICATION_CODE,
      variables: { input: { type, email, token: 'some-test-token' } },
    })
    expect(result && result.data && result.data.sendVerificationCode).toBe(true)

    const codes = await userService.findVerificationCodes({ where: { email } })
    const code = codes?.length > 0 ? codes[0] : {}
    expect(code.status).toBe(VERIFICATION_CODE_STATUS.active)

    // mark it as expired
    await userService.markVerificationCodeAs({
      codeId: code.id,
      status: VERIFICATION_CODE_STATUS.expired,
    })

    // confirm
    const serverMutate = await testClient({ connections })
    const confirmedResult = await serverMutate.executeOperation({
      query: CONFIRM_VERIFICATION_CODE,
      variables: { input: { type, email, code: code.code } },
    })
    expect(_get(confirmedResult, 'errors.0.extensions.code')).toBe(
      'CODE_EXPIRED'
    )
  })
  test('check email if belong to archived users', async () => {
    const archivedEmail = 'archived@matters.town'
    const archivedUser = await userService.create({
      email: archivedEmail,
      password: '12345678',
    })
    const { data } = await updateUserState(
      {
        id: toGlobalId({ type: NODE_TYPES.User, id: archivedUser.id }),
        state: USER_STATE.archived,
        password: '12345678',
      },
      connections
    )
    expect(data.updateUserState[0].status.state).toBe('archived')

    const server = await testClient({ connections })
    const { errors } = await server.executeOperation({
      query: SEND_VERIFICATION_CODE,
      variables: { input: { type, email: archivedEmail } },
    })
    expect(errors[0].extensions.code).toBe('FORBIDDEN_BY_STATE')
  })
})

const TOPIC_ID_1 = toGlobalId({ type: NODE_TYPES.Topic, id: 1 })
const TOPIC_ID_2 = toGlobalId({ type: NODE_TYPES.Topic, id: 2 })

describe('topics & chapters', () => {
  test('get user topics', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_TOPICS,
      variables: {},
    })

    expect(_get(data, 'viewer.topics.totalCount')).toBeGreaterThan(0)

    const firstTopic = _get(data, 'viewer.topics.edges.0.node')

    expect(_get(firstTopic, 'id')).toBeDefined()
    expect(_get(firstTopic, 'chapterCount')).toBeGreaterThan(0)
    expect(_get(firstTopic, 'articleCount')).toBeGreaterThan(0)
    expect(_get(firstTopic, 'chapters.0.id')).toBeDefined()
    expect(_get(firstTopic, 'chapters.0.articles.0.id')).toBeDefined()
    expect(_get(firstTopic, 'articles.0.id')).toBeDefined()
  })

  test('create topic', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })

    // create
    const title = 'topic 123'
    const { data: created } = await server.executeOperation({
      query: PUT_TOPIC,
      variables: { input: { title } },
    })

    expect(_get(created, 'putTopic.title')).toBe(title)
  })

  test('update topic', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })

    const title = 'topic 345'
    const articles = ['QXJ0aWNsZTox', 'QXJ0aWNsZTo0']
    const { data: updated } = await server.executeOperation({
      query: PUT_TOPIC,
      variables: {
        input: {
          id: TOPIC_ID_1,
          title,
          articles,
        },
      },
    })

    expect(_get(updated, 'putTopic.title')).toEqual(title)
    expect(
      (_get(updated, 'putTopic.articles') as [{ id: string }]).map(
        ({ id }) => id
      )
    ).toEqual(articles)
  })

  test('create chapter', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })

    // create
    const title = 'chapter 123'
    const { data: created } = await server.executeOperation({
      query: PUT_CHAPTER,
      variables: {
        input: { title, topic: TOPIC_ID_1 },
      },
    })

    expect(_get(created, 'putChapter.title')).toBe(title)
  })

  test('update chapter', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })

    const title = 'chapter 345'
    const articles = ['QXJ0aWNsZTox', 'QXJ0aWNsZTo0']
    const { data: updated } = await server.executeOperation({
      query: PUT_CHAPTER,
      variables: {
        input: { id: 'Q2hhcHRlcjox', title, articles },
      },
    })

    expect(_get(updated, 'putChapter.title')).toEqual(title)
    expect(
      (_get(updated, 'putChapter.articles') as [{ id: string }]).map(
        ({ id }) => id
      )
    ).toEqual(articles)
  })

  test('sort topics', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })

    const { data } = await server.executeOperation({
      query: SORT_TOPICS,
      variables: {
        input: { ids: [TOPIC_ID_2, TOPIC_ID_1] },
      },
    })

    expect(_get(data, 'sortTopics.0.id')).toBe(TOPIC_ID_2)
    expect(_get(data, 'sortTopics.1.id')).toBe(TOPIC_ID_1)
  })

  test('delete topics', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })

    const { data } = await server.executeOperation({
      query: DELETE_TOPICS,
      variables: {
        input: { ids: [] },
      },
    })

    expect(_get(data, 'deleteTopics')).toBe(true)
  })
})

describe('likecoin', () => {
  test('reset liker id', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })

    // check if exists
    const { data } = await server.executeOperation({
      query: GET_USER_BY_USERNAME,
      variables: { input: { userName: 'test2' } },
    })

    // reset
    const resetResult = await server.executeOperation({
      query: RESET_USER_LIKER_ID,
      variables: { input: { id: _get(data, 'user.id') } },
    })
    expect(_get(resetResult, 'data.resetLikerId.id')).toBe(
      _get(data, 'user.id')
    )
    expect(_get(resetResult, 'data.resetLikerId.likerId')).toBeFalsy()
  })
})

describe('crypto wallet', () => {
  test('reset wallet', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })

    // check if exists
    const { data } = await server.executeOperation({
      query: GET_USER_BY_USERNAME,
      variables: { input: { userName: 'test2' } },
    })

    // reset
    const resetResult = await server.executeOperation({
      query: RESET_USER_WALLET,
      variables: { input: { id: _get(data, 'user.id') } },
    })
    expect(_get(resetResult, 'data.resetWallet.id')).toBe(_get(data, 'user.id'))
    expect(_get(resetResult, 'data.resetWallet.info.ethAddress')).toBeFalsy()
  })

  test('reset wallet forbidden', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })

    // check if exists
    const { data } = await server.executeOperation({
      query: GET_USER_BY_USERNAME,
      variables: { input: { userName: 'test10' } },
    })

    // reset
    const resetResult = await server.executeOperation({
      query: RESET_USER_WALLET,
      variables: { input: { id: _get(data, 'user.id') } },
    })
    expect(_get(resetResult, 'data.resetWallet.id')).toBeFalsy()
  })
})

describe('update user state', () => {
  // archive user
  const id = toGlobalId({ type: NODE_TYPES.User, id: '1' })
  let archivedUserEmail: string
  // active users
  const activeUser1Id = toGlobalId({ type: NODE_TYPES.User, id: '2' })

  const activeUser1Email = 'test2@matters.news'
  const activeUser2Email = 'test3@matters.news'

  test('archive user should provide viewer passwd', async () => {
    const { errors } = await updateUserState(
      { id, state: USER_STATE.archived },
      connections
    )
    expect(errors[0].message).toBe('`password` is required for archiving user')
    const { data } = await updateUserState(
      {
        id,
        state: USER_STATE.archived,
        password: '12345678',
      },
      connections
    )
    expect(data.updateUserState[0].status.state).toBe('archived')

    archivedUserEmail = data.updateUserState[0].info.email
  })

  test('archived user can not change to other state', async () => {
    const { errors } = await updateUserState(
      { id, state: USER_STATE.banned },
      connections
    )
    expect(errors[0].message).toBe('user has already been archived')

    const { errors: errors2 } = await updateUserState(
      {
        emails: [archivedUserEmail, activeUser1Email],
        state: USER_STATE.banned,
      },
      connections
    )
    expect(errors2[0].message).toBe('user has already been archived')
  })
  test('ban user by id', async () => {
    const { data } = await updateUserState(
      {
        id: activeUser1Id,
        state: USER_STATE.banned,
      },
      connections
    )
    expect(data.updateUserState[0].status.state).toBe('banned')
  })
  test('ban users by emails', async () => {
    const { data } = await updateUserState(
      {
        emails: [activeUser2Email],
        state: USER_STATE.banned,
      },
      connections
    )
    expect(data.updateUserState[0].status.state).toBe('banned')
  })
})

describe('query social accounts', () => {
  const GET_VIEWER_SOCIAL_ACCOUNTS = /* GraphQL */ `
    query {
      viewer {
        userName
        id
        info {
          socialAccounts {
            type
            userName
            email
          }
        }
      }
    }
  `
  const GET_USER_SOCIAL_ACCOUNTS = /* GraphQL */ `
    query getUserSocialAccounts($input: UserInput!) {
      user(input: $input) {
        info {
          socialAccounts {
            type
            userName
            email
          }
        }
      }
    }
  `
  test('visitors do not have social accounts', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_SOCIAL_ACCOUNTS,
    })
    expect(data.viewer.info.socialAccounts).toEqual([])
  })
  test('users social accounts', async () => {
    const server = await testClient({ isAuth: true, connections })
    // no social accounts
    const { data } = await server.executeOperation({
      query: GET_VIEWER_SOCIAL_ACCOUNTS,
    })
    expect(data.viewer.info.socialAccounts).toEqual([])
    // having social accounts
    const userId = fromGlobalId(data.viewer.id).id
    await userService.createSocialAccount({
      userId,
      type: 'Facebook',
      userName: 'test',
      providerAccountId: 'test1',
    })
    await userService.createSocialAccount({
      userId,
      type: 'Twitter',
      userName: 'test',
      providerAccountId: 'test2',
    })
    await userService.createSocialAccount({
      userId,
      type: 'Google',
      email: 'testsocialaccounts@gmail.com',
      providerAccountId: 'test2',
    })
    const { data: data2 } = await server.executeOperation({
      query: GET_VIEWER_SOCIAL_ACCOUNTS,
    })
    expect(data2.viewer.info.socialAccounts.length).toBe(3)

    // users can not visit others social accounts
    const userName = data.viewer.userName
    const othersServer = await testClient({
      isAuth: true,
      isMatty: true,
      connections,
    })
    const { data: data3 } = await othersServer.executeOperation({
      query: GET_USER_SOCIAL_ACCOUNTS,
      variables: { input: { userName } },
    })
    expect(data3.user.info.socialAccounts).toEqual([])
  })
})

describe('verify user email', () => {
  const VERIFY_EMAIL = /* GraphQL */ `
    mutation ($input: VerifyEmailInput!) {
      verifyEmail(input: $input) {
        auth
        token
        user {
          userName
          info {
            email
            emailVerified
          }
        }
      }
    }
  `
  test('users with verified email can not verify email', async () => {
    const email = 'verified@matters.town'
    await userService.create({
      email,
      emailVerified: true,
    })
    const server = await testClient({ connections })
    const { errors } = await server.executeOperation({
      query: VERIFY_EMAIL,
      variables: { input: { email, code: 'test' } },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
  test('codes are checked', async () => {
    const email = 'notverified@matters.town'
    const user = await userService.create({ email, emailVerified: false })
    const server = await testClient({ context: { viewer: user }, connections })
    // no exsiting code
    const { errors } = await server.executeOperation({
      query: VERIFY_EMAIL,
      variables: { input: { email, code: 'test' } },
    })
    expect(errors?.[0].extensions.code).toBe('CODE_INVALID')

    // user id not matching
    const { code: badCode } = await userService.createVerificationCode({
      userId: '1',
      type: 'email_verify',
      email,
    })
    const { errors: errors2 } = await server.executeOperation({
      query: VERIFY_EMAIL,
      variables: { input: { email, code: badCode } },
    })
    expect(errors2?.[0].extensions.code).toBe('CODE_INVALID')

    // succeed
    const { code } = await userService.createVerificationCode({
      userId: user.id,
      type: 'email_verify',
      email,
    })
    const { data } = await server.executeOperation({
      query: VERIFY_EMAIL,
      variables: { input: { email, code } },
    })
    expect(data.verifyEmail.auth).toBe(false)
    expect(data.verifyEmail.token).toBe(null)
    expect(data.verifyEmail.user.info.emailVerified).toBe(true)
  })
})

describe('update user email', () => {
  const QUERY_VIEWER_CHANGE_EMAIL_TIMES_LEFT = /* GraphQL */ `
    query {
      viewer {
        id
        info {
          email
        }
        status {
          changeEmailTimesLeft
        }
      }
    }
  `
  test('query user email change times left', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: QUERY_VIEWER_CHANGE_EMAIL_TIMES_LEFT,
    })
    expect(data.viewer.status.changeEmailTimesLeft).toBe(3)
  })
})
