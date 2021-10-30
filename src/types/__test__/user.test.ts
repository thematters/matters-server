import _get from 'lodash/get'
import _set from 'lodash/set'
import _values from 'lodash/values'

import {
  MATERIALIZED_VIEW,
  NODE_TYPES,
  VERIFICATION_CODE_STATUS,
} from 'common/enums'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { refreshView, UserService } from 'connectors'

import {
  defaultTestUser,
  getUserContext,
  registerUser,
  testClient,
} from './utils'

let userService: any
beforeAll(async () => {
  userService = new UserService()
  // await userService.initSearch()
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

const UPDATE_USER_INFO_DESCRIPTION = /* GraphQL */ `
  mutation UpdateUserInfo($input: UpdateUserInfoInput!) {
    updateUserInfo(input: $input) {
      info {
        description
      }
    }
  }
`
const UPDATE_USER_INFO_AVATAR = /* GraphQL */ `
  mutation UpdateUserInfo($input: UpdateUserInfoInput!) {
    updateUserInfo(input: $input) {
      id
      avatar
    }
  }
`
const UPDATE_NOTIFICARION_SETTINGS = /* GraphQL */ `
  mutation UpdateNotificationSetting($input: UpdateNotificationSettingInput!) {
    updateNotificationSetting(input: $input) {
      settings {
        notification {
          enable
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
    }
  }
`
const GET_VIEW_ARTICLES = /* GraphQL */ `
  query ($input: ConnectionArgs!) {
    viewer {
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
      settings {
        language
        notification {
          enable
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
const GET_VIEWER_STATUS = /* GraphQL */ `
  query {
    viewer {
      status {
        articleCount
        commentCount
      }
    }
  }
`
const GET_VIEWER_RECOMMENDATION = (list: string) => /* GraphQL */ `
query($input: ConnectionArgs!) {
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

const GET_VIEWER_CRYPTO_WALLET = /* GraphQL */ `
  query {
    viewer {
      id
      info {
        cryptoWallet {
          id
          address
        }
      }
    }
  }
`

const PUT_CRYPTO_WALLET = /* GraphQL */ `
  mutation PutCryptoWallet($input: PutWalletInput!) {
    putWallet(input: $input) {
      id
      address
    }
  }
`

const DELETE_CRYPTO_WALLET = /* GraphQL */ `
  mutation DeleteCryptoWallet($input: DeleteWalletInput!) {
    deleteWallet(input: $input)
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
    const registerResult = await registerUser(user)
    expect(_get(registerResult, 'data.userRegister.token')).toBeTruthy()

    const context = await getUserContext({ email: user.email })
    const server = await testClient({
      context,
    })
    const newUserResult = await server.executeOperation({
      query: GET_VIEWER_INFO,
    })
    const displayName = _get(newUserResult, 'data.viewer.displayName')
    const info = _get(newUserResult, 'data.viewer.info')
    expect(displayName).toBe(user.displayName)
    expect(info.email).toBe(user.email)
  })

  test('auth fail when password is incorrect', async () => {
    const email = 'test1@matters.news'
    const password = 'wrongPassword'
    const server = await testClient()

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

    const server = await testClient()
    const result = await server.executeOperation({
      query: USER_LOGIN,
      variables: { input: { email, password } },
    })
    expect(_get(result, 'data.userLogin.auth')).toBe(true)
  })

  test('retrive user info after login', async () => {
    const server = await testClient({
      isAuth: true,
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
    const server = await testClient()
    const { data } = await server.executeOperation({
      query: GET_USER_BY_USERNAME,
      variables: { input: { userName } },
    })
    expect(_get(data, 'user.userName')).toBe(userName)
  })
  test('retrive user articles', async () => {
    const server = await testClient({
      isAuth: true,
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

  test('retrive UserSettings', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const res = await server.executeOperation({
      query: GET_VIEWER_SETTINGS,
    })
    const { data } = res
    const settings = _get(data, 'viewer.settings')
    expect(settings).toBeDefined()
    expect(settings.notification).toBeDefined()
  })

  test('retrive subscriptions', async () => {
    const server = await testClient({
      isAuth: true,
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

  test('retrive UserStatus', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_STATUS,
    })
    const status = _get(data, 'viewer.status')
    expect(status).toBeDefined()
  })
})

describe('mutations on User object', () => {
  test('follow a user with `toggleFollowUser`', async () => {
    const followeeId = toGlobalId({ type: NODE_TYPES.User, id: '4' })
    const server = await testClient({ isAuth: true })
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
    const server = await testClient({ isAuth: true })
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
    const server = await testClient({ isAuth: true })
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
    const server = await testClient({ isAuth: true })
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

  test('updateUserInfoDescription', async () => {
    const description = 'foo bar'
    const server = await testClient({
      isAuth: true,
    })
    const { data } = await server.executeOperation({
      query: UPDATE_USER_INFO_DESCRIPTION,
      variables: { input: { description } },
    })
    const info = _get(data, 'updateUserInfo.info')
    expect(info.description).toEqual(description)
  })

  test('updateUserInfoAvatar', async () => {
    const avatarAssetUUID = '00000000-0000-0000-0000-000000000001'
    const server = await testClient({
      isAuth: true,
    })
    const { data } = await server.executeOperation({
      query: UPDATE_USER_INFO_AVATAR,
      variables: { input: { avatar: avatarAssetUUID } },
    })
    const avatar = _get(data, 'updateUserInfo.avatar')
    expect(avatar).toEqual(expect.stringContaining('path/to/file.jpg'))
  })

  test('updateNotificationSetting', async () => {
    const server = await testClient({
      isAuth: true,
    })
    const { data } = await server.executeOperation({
      query: UPDATE_NOTIFICARION_SETTINGS,
      variables: { input: { type: 'enable', enabled: false } },
    })
    const enable = _get(
      data,
      'updateNotificationSetting.settings.notification.enable'
    )
    expect(enable).toBe(false)
  })
})

describe('user recommendations', () => {
  test('retrive articles from hottest, newest and icymi', async () => {
    await refreshView(MATERIALIZED_VIEW.article_hottest_materialized)

    const lists = ['hottest', 'newest', 'icymi']
    for (const list of lists) {
      const serverNew = await testClient({
        isAuth: true,
      })

      const result = await serverNew.executeOperation({
        query: GET_VIEWER_RECOMMENDATION(list),
        variables: { input: { first: 1 } },
      })
      const { data } = result
      const article = _get(data, `viewer.recommendation.${list}.edges.0.node`)
      expect(fromGlobalId(article.id).type).toBe('Article')
    }
  })

  test('retrive tags from tags', async () => {
    await refreshView(MATERIALIZED_VIEW.curation_tag_materialized)
    await refreshView(MATERIALIZED_VIEW.tag_count_materialized)

    const serverNew = await testClient({
      isAuth: true,
    })
    const { data } = await serverNew.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_TAGS,
      variables: { input: { first: 1 } },
    })
    const tag = _get(data, 'viewer.recommendation.tags.edges.0.node')
    expect(fromGlobalId(tag.id).type).toBe('Tag')
  })

  test('retrive users from authors', async () => {
    await refreshView(MATERIALIZED_VIEW.user_reader_materialized)

    const serverNew = await testClient({
      isAuth: true,
    })
    const result = await serverNew.executeOperation({
      query: GET_AUTHOR_RECOMMENDATION('authors'),
      variables: { input: { first: 1 } },
    })
    const { data } = result
    const author = _get(data, 'viewer.recommendation.authors.edges.0.node')
    expect(fromGlobalId(author.id).type).toBe('User')
  })
})

describe('badges', () => {
  test('get user badges', async () => {
    const server = await testClient({
      isAuth: true,
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

  test('send verification code', async () => {
    // send
    const server = await testClient()
    const result = await server.executeOperation({
      query: SEND_VERIFICATION_CODE,
      variables: { input: { type, email, token: 'some-test-token' } },
    })
    expect(result && result.data && result.data.sendVerificationCode).toBe(true)

    const [code] = await userService.findVerificationCodes({ email })
    expect(code.status).toBe(VERIFICATION_CODE_STATUS.active)

    // confirm
    const serverMutate = await testClient()
    const confirmedResult = await serverMutate.executeOperation({
      query: CONFIRM_VERIFICATION_CODE,
      variables: { input: { type, email, code: code.code } },
    })
    expect(
      confirmedResult &&
        confirmedResult.data &&
        confirmedResult.data.confirmVerificationCode
    ).toBe(code.uuid)
    const [confirmedCode] = await userService.findVerificationCodes({ email })
    expect(confirmedCode.status).toBe(VERIFICATION_CODE_STATUS.verified)
  })
})

const TOPIC_ID_1 = toGlobalId({ type: NODE_TYPES.Topic, id: 1 })
const TOPIC_ID_2 = toGlobalId({ type: NODE_TYPES.Topic, id: 2 })

describe('topics & chapters', () => {
  test('get user topics', async () => {
    const server = await testClient({
      isAuth: true,
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
    })

    // check if exists
    const { data } = await server.executeOperation({
      query: GET_USER_BY_USERNAME,
      variables: { input: { userName: 'test1' } },
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
  const errorPath = 'errors.0.extensions.code'

  // public testing account
  const address = '0x863628762A68Ec012396b1Fb9A27F4e343510FCe'
  const signedMessage =
    '0x5f16f4c7f149ac4f9510d9cf8cf384038ad348b3bcdc01915f95de12df9d1b02'
  const signature =
    '0xfe46556233144863cf5c1ac84b914cdc13d378f1a3ffba1669453b312b78cb9120c2' +
    '0bd2729288214f2db1c8170673d5d6d09d809a142e01825524b03b7b85b51c'

  let wallet: Record<string, any>

  test('test validator before wallet connection', async () => {
    const server = await testClient({ isAuth: true })
    const { data } = await server.executeOperation({
      query: GET_VIEWER_CRYPTO_WALLET,
      variables: {},
    })
    expect(_get(data, 'viewer.info.cryptoWallet')).toBeNull()

    const [failedResult1, failedResult2] = await Promise.all([
      server.executeOperation({
        query: PUT_CRYPTO_WALLET,
        variables: {
          input: {
            address,
            purpose: 'airdrop',
            signedMessage: `${signedMessage}0x`,
            signature,
          },
        },
      }),
      server.executeOperation({
        query: PUT_CRYPTO_WALLET,
        variables: {
          input: {
            address: `${address}0x`,
            purpose: 'airdrop',
            signedMessage,
            signature,
          },
        },
      }),
    ])
    expect(_get(failedResult1, errorPath)).toBe('BAD_USER_INPUT')
    expect(_get(failedResult2, errorPath)).toBe('BAD_USER_INPUT')
  })

  test('connect wallet', async () => {
    const server = await testClient({ isAuth: true })
    const baseInput = {
      query: PUT_CRYPTO_WALLET,
      variables: {
        input: {
          address,
          purpose: 'airdrop',
          signedMessage,
          signature,
        },
      },
    }
    const putResult = await server.executeOperation(baseInput)
    wallet = _get(putResult, 'data.putWallet', {})
    expect(wallet.address).toBe(address)

    // make sure user cannot reconnect existing wallet
    const failedResult = await server.executeOperation(baseInput)
    expect(_get(failedResult, errorPath)).toBe('CRYPTO_WALLET_EXISTS')

    const failedResult2 = await server.executeOperation(
      _set(baseInput, 'variables.input.purpose', 'connect')
    )
    expect(_get(failedResult2, errorPath)).toBe('FORBIDDEN')
  })

  test('disconnected wallet', async () => {
    const server = await testClient({ isAuth: true })
    const deleteResult = await server.executeOperation({
      query: DELETE_CRYPTO_WALLET,
      variables: {
        input: {
          id: wallet.id,
        },
      },
    })
    expect(_get(deleteResult, 'data.deleteWallet')).toBeTruthy()

    const { data } = await server.executeOperation({
      query: GET_VIEWER_CRYPTO_WALLET,
      variables: {},
    })
    expect(_get(data, 'viewer.info.cryptoWallet')).toBeNull()
  })
})
