import _get from 'lodash/get'
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
      followees(input: $input) {
        edges {
          node {
            id
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
const GET_VIEWER_RECOMMENDATION = (list: string) => `
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

const GET_VIEWER_RECOMMENDATION_TAGS = `
query($input: RecommendInput!) {
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

const GET_AUTHOR_RECOMMENDATION = (list: string) => `
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
    const followees = _get(data, 'viewer.followees.edges')
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
    expect(circles.length).toBe(0)
    expect(users.length).toBeTruthy()
    expect(tags.length).toBeTruthy()
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
