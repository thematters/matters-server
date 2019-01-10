import _get from 'lodash/get'
// local
import { fromGlobalId, toGlobalId } from 'common/utils'
import { MAT_UNIT, TRANSACTION_PURPOSE } from 'common/enums'
import { UserService } from 'connectors'
import { knex } from 'connectors/db'
import { defaultTestUser, getUserContext, testClient } from './utils'

let userService: any
beforeAll(async () => {
  userService = new UserService()
  await userService.initSearch()
})
afterAll(knex.destroy)

const USER_LOGIN = `
  mutation UserLogin($input: UserLoginInput!) {
    userLogin(input: $input) {
      auth
      token
    }
  }
`
const USER_REGISTER = `
  mutation UserRegister($input: UserRegisterInput!) {
    userRegister(input: $input) {
      auth
      token
    }
  }
`

const FOLLOW_USER = `
  mutation FollowerUser($input: FollowUserInput!) {
    followUser(input: $input)
  }
`
const UNFOLLOW_USER = `
  mutation FollowerUser($input: UnfollowUserInput!) {
    unfollowUser(input: $input)
  }
`
const UPDATE_USER_INFO_DESCRIPTION = `
  mutation UpdateUserInfo($input: UpdateUserInfoInput!) {
    updateUserInfo(input: $input) {
      info {
        description
      }
    }
  }
`
const UPDATE_USER_INFO_AVATAR = `
  mutation UpdateUserInfo($input: UpdateUserInfoInput!) {
    updateUserInfo(input: $input) {
      info {
        avatar
      }
    }
  }
`
const UPDATE_NOTIFICARION_SETTINGS = `
  mutation UpdateNotificationSetting($input: UpdateNotificationSettingInput!) {
    updateNotificationSetting(input: $input) {
      enable
    }
  }
`
const GET_USER_BY_USERNAME = `
  query ($input: UserInput!) {
    user(input: $input) {
      info {
        userName
      }
    }
  }
`

const GET_VIEWER_MAT = `
  query {
    viewer {
      status {
        MAT {
          total
        }
      }
    }
  }
`

const GET_VIEWER_MAT_HISOTRY = `
  query ($input: ListInput!) {
    viewer {
      status {
        MAT {
          history(input: $input) {
            delta
            reference {
              id
            }
          }
        }
      }
    }
  }
`

const GET_VIEWER_INFO = `
  query {
    viewer {
      uuid
      info {
        email
        displayName
        description
        avatar
        mobile
        readSpeed
        createdAt
      }
    }
  }
`
const GET_VIEW_ARTICLES = `
  query ($input: ListInput!) {
    viewer {
      articles(input: $input) {
        id
      }
    }
  }
`
const GET_VIEWER_SETTINGS = `
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
const GET_USER_INVITATION = `
  query {
    viewer {
      id
      status {
        invitation {
          MAT
          left
          sent(input:{}) {
            email
            user {
              id
            }
            accepted
            createdAt
          }
        }
      }
    }
  }
`
const GET_VIEWER_SUBSCRIPTIONS = `
  query ($input: ListInput!) {
    viewer {
      subscriptions(input: $input) {
        id
      }
    }
  }
`
const GET_VIEWER_FOLLOWERS = `
  query ($input: ListInput!) {
    viewer {
      followers(input: $input) {
        id
      }
    }
  }
`
const GET_VIEWER_FOLLOWEES = `
  query ($input: ListInput!) {
    viewer {
      followees(input: $input) {
        id
      }
    }
  }
`
const GET_VIEWER_STATUS = `
  query {
    viewer {
      status {
        articleCount
        commentCount
        followerCount
        followeeCount
        subscriptionCount
      }
    }
  }
`
const GET_VIEWER_RECOMMENDATION = (list: string) => `
query($input: ListInput!) {
  viewer {
    recommendation {
      ${list}(input: $input) {
        id
      }
    }
  }
}
`
const GET_VIEWER_BADGES = `
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
const INVITE = `
  mutation Invite($input: InviteInput!) {
    invite(input: $input)
  }
`

export const registerUser = async (user: { [key: string]: string }) => {
  const { mutate } = await testClient()
  return mutate({
    mutation: USER_REGISTER,
    // @ts-ignore
    variables: { input: user }
  })
}

export const getViewerMAT = async () => {
  const { query } = await testClient({ isAuth: true })
  const result = await query({
    query: GET_VIEWER_MAT,
    // @ts-ignore
    variables: { input: {} }
  })
  const { data } = result
  const { total } =
    data && data.viewer && data.viewer.status && data.viewer.status.MAT
  return total
}

export const getViewerMATHistory = async () => {
  const { query } = await testClient({ isAuth: true })
  const result = await query({
    query: GET_VIEWER_MAT_HISOTRY,
    // @ts-ignore
    variables: { input: {} }
  })
  const { data } = result
  return _get(data, 'viewer.status.MAT.history')
}

export const getUserInvitation = async (isAdmin = false) => {
  const { query } = await testClient({
    isAuth: true,
    isAdmin
  })
  const result = await query({
    query: GET_USER_INVITATION
  })
  const { data } = result
  return data
}

export const updateUserDescription = async ({
  email,
  description
}: {
  email?: string
  description: string
}) => {
  let _email = defaultTestUser.email
  if (email) {
    _email = email
  }
  const context = await getUserContext({ email: _email })
  const { mutate } = await testClient({
    context
  })
  return mutate({
    mutation: UPDATE_USER_INFO_DESCRIPTION,
    // @ts-ignore
    variables: { input: { description } }
  })
}

describe('register and login functionarlities', () => {
  test('register user and retrieve info', async () => {
    const user = {
      email: `test-${Math.floor(Math.random() * 100)}@matters.news`,
      displayName: 'test user',
      password: '567',
      codeId: '123'
    }
    const { data: registerData } = await registerUser(user)
    expect(_get(registerData, 'userRegister.token')).toBeTruthy()

    const context = await getUserContext({ email: user.email })
    const { query } = await testClient({
      context
    })
    const newUserResult = await query({
      query: GET_VIEWER_INFO
    })
    const info = _get(newUserResult, 'data.viewer.info')
    expect(info.displayName).toBe(user.displayName)
    expect(info.email).toBe(user.email)
  })

  test('auth fail when password is incorrect', async () => {
    const email = 'test1@matters.news'
    const password = 'wrongPassword'
    const { mutate } = await testClient()
    const result = await mutate({
      mutation: USER_LOGIN,
      // @ts-ignore
      variables: { input: { email, password } }
    })
    expect(_get(result, 'data.userLogin.auth')).toBe(false)
  })

  test('auth success when password is correct', async () => {
    const email = 'test1@matters.news'
    const password = '123'

    const { mutate } = await testClient()
    const result = await mutate({
      mutation: USER_LOGIN,
      // @ts-ignore
      variables: { input: { email, password } }
    })
    expect(_get(result, 'data.userLogin.auth')).toBe(true)
  })

  test('retrive user info after login', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const { data } = await query({
      query: GET_VIEWER_INFO
    })
    const info = _get(data, 'viewer.info')
    expect(info.email).toEqual(defaultTestUser.email)
  })
})

describe('user mat', async () => {
  test('total', async () => {
    const mat = await getViewerMAT()
    expect(typeof mat).toBe('number')
  })

  test('history', async () => {
    const history = await getViewerMATHistory()
    const trx = history && history[0]
    expect(typeof trx.delta).toBe('number')
  })

  test('history reference', async () => {
    const history = await getViewerMATHistory()
    const reference = history && history[0] && history[0].reference
    expect(['Article', 'Invitation']).toContain(fromGlobalId(reference.id).type)
  })
})

describe('user query fields', () => {
  test('get user by username', async () => {
    const userName = 'test 1'
    const { query } = await testClient()
    const { data } = await query({
      query: GET_USER_BY_USERNAME,
      // @ts-ignore
      variables: { input: { userName } }
    })
    expect(_get(data, 'user.info.userName')).toBe(userName)
  })
  test('retrive user articles', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const { data } = await query({
      query: GET_VIEW_ARTICLES,
      // @ts-ignore
      variables: { input: { limit: 1 } }
    })
    const articles = _get(data, 'viewer.articles')
    expect(articles.length).toEqual(1)
    expect(articles[0].id).toBeDefined()
  })

  test('retrive UserSettings', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const res = await query({
      query: GET_VIEWER_SETTINGS
    })
    const { data } = res
    const settings = _get(data, 'viewer.settings')
    expect(settings).toBeDefined()
    expect(settings.notification).toBeDefined()
  })

  test('retrive subscriptions', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const { data } = await query({
      query: GET_VIEWER_SUBSCRIPTIONS,
      // @ts-ignore
      variables: { input: {} }
    })
    const subscriptions = _get(data, 'viewer.subscriptions')
    expect(subscriptions.length).toEqual(3)
  })

  test('retrive followers', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const { data } = await query({
      query: GET_VIEWER_FOLLOWERS,
      // @ts-ignore
      variables: { input: {} }
    })
    const followers = _get(data, 'viewer.followers')
    expect(followers.length).toEqual(0)
  })

  test('retrive followees', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const { data } = await query({
      query: GET_VIEWER_FOLLOWEES,
      // @ts-ignore
      variables: { input: {} }
    })
    const followees = _get(data, 'viewer.followees')
    expect(followees.length).toEqual(1)
  })

  test('retrive UserStatus', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const { data } = await query({
      query: GET_VIEWER_STATUS
    })
    const status = _get(data, 'viewer.status')
    expect(status).toBeDefined()
  })
})

describe('mutations on User object', () => {
  test('followUser and unfollowUser', async () => {
    const followeeId = toGlobalId({ type: 'User', id: '3' })

    // follow
    const { mutate } = await testClient({
      isAuth: true
    })
    const { data: followData } = await mutate({
      mutation: FOLLOW_USER,
      // @ts-ignore
      variables: { input: { id: followeeId } }
    })
    expect(followData && followData.followUser).toBeTruthy()

    // check
    const { query } = await testClient({ isAuth: true })
    const { data: followeeData } = await query({
      query: GET_VIEWER_FOLLOWEES,
      // @ts-ignore
      variables: { input: {} }
    })
    const followees = _get(followeeData, 'viewer.followees')
    expect(followees.map(({ id }: { id: string }) => id)).toContain(followeeId)

    // unfollow
    const { mutate: mutateNew } = await testClient({ isAuth: true })
    const { data: unfollowData } = await mutateNew({
      mutation: UNFOLLOW_USER,
      // @ts-ignore
      variables: { input: { id: followeeId } }
    })
    expect(unfollowData && unfollowData.unfollowUser).toBeTruthy()

    // re-check
    const { query: queryNew } = await testClient({ isAuth: true })
    const { data: followeeDataNew } = await queryNew({
      query: GET_VIEWER_FOLLOWEES,
      // @ts-ignore
      variables: { input: {} }
    })
    const followeesNew = _get(followeeDataNew, 'viewer.followees')
    expect(
      followeesNew.filter(({ id }: { id: string }) => id === followeeId).length
    ).toEqual(0)
  })

  test('updateUserInfoDescription', async () => {
    const description = 'foo bar'
    const { mutate } = await testClient({
      isAuth: true
    })
    const { data } = await mutate({
      mutation: UPDATE_USER_INFO_DESCRIPTION,
      // @ts-ignore
      variables: { input: { description } }
    })
    const info = _get(data, 'updateUserInfo.info')
    expect(info.description).toEqual(description)
  })

  test('updateUserInfoAvatar', async () => {
    const avatarAssetUUID = '00000000-0000-0000-0000-000000000001'
    const { mutate } = await testClient({
      isAuth: true
    })
    const { data } = await mutate({
      mutation: UPDATE_USER_INFO_AVATAR,
      // @ts-ignore
      variables: { input: { avatar: avatarAssetUUID } }
    })
    const { avatar } = _get(data, 'updateUserInfo.info')
    expect(avatar).toEqual(expect.stringContaining('path/to/file.jpg'))
  })

  test('updateNotificationSetting', async () => {
    const { mutate } = await testClient({
      isAuth: true
    })
    const { data } = await mutate({
      mutation: UPDATE_NOTIFICARION_SETTINGS,
      // @ts-ignore
      variables: { input: { type: 'enable', enabled: false } }
    })
    const enable = _get(data, 'updateNotificationSetting.enable')
    expect(enable).toBe(false)
  })
})

describe('user recommendations', () => {
  test('retrive articles from hottest, icymi, topics, followeeArticles and newest', async () => {
    const lists = ['hottest', 'icymi', 'topics', 'followeeArticles', 'newest']
    for (const list of lists) {
      const { query: queryNew } = await testClient({
        isAuth: true
      })
      const { data } = await queryNew({
        query: GET_VIEWER_RECOMMENDATION(list),
        // @ts-ignore
        variables: { input: { limit: 1 } }
      })
      const article =
        data &&
        data.viewer &&
        data.viewer.recommendation &&
        data.viewer.recommendation[list] &&
        data.viewer.recommendation[list][0]
      expect(fromGlobalId(article.id).type).toBe('Article')
    }
  })

  test('retrive tags from tags', async () => {
    const { query: queryNew } = await testClient({
      isAuth: true
    })
    const { data } = await queryNew({
      query: GET_VIEWER_RECOMMENDATION('tags'),
      // @ts-ignore
      variables: { input: { limit: 1 } }
    })
    const tag = _get(data, 'viewer.recommendation.tags.0')
    expect(fromGlobalId(tag.id).type).toBe('Tag')
  })

  test('retrive users from authors', async () => {
    const { query: queryNew } = await testClient({
      isAuth: true
    })
    const { data } = await queryNew({
      query: GET_VIEWER_RECOMMENDATION('authors'),
      // @ts-ignore
      variables: { input: { limit: 1 } }
    })
    const author = _get(data, 'viewer.recommendation.authors.0')
    expect(fromGlobalId(author.id).type).toBe('User')
  })
})

describe('badges', async () => {
  test('get user badges', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const { data } = await query({
      query: GET_VIEWER_BADGES,
      // @ts-ignore
      variables: {}
    })
    expect(_get(data, 'viewer.info.badges.0.type')).toBe('seed')
  })
})

describe('invitation', async () => {
  test('invitation mat', async () => {
    const data = await getUserInvitation()
    expect(_get(data, 'viewer.status.invitation.MAT')).toBe(
      MAT_UNIT.joinByInvitation
    )
  })

  test('invite email', async () => {
    const unregisterEmail = `test-new-${Math.floor(
      Math.random() * 100
    )}@matters.news`
    const invitationData = await getUserInvitation()
    const left = _get(invitationData, 'viewer.status.invitation.left')
    const { mutate } = await testClient({
      isAuth: true
    })
    const { data: invitedData, errors } = await mutate({
      mutation: INVITE,
      // @ts-ignore
      variables: {
        input: {
          email: unregisterEmail
        }
      }
    })

    if (errors) {
      throw errors
    }

    expect(invitedData.invite).toBe(true)

    // retrieve user's invitations
    const newInvitationData = await getUserInvitation()
    expect(_get(newInvitationData, 'viewer.status.invitation.left')).toBe(
      Math.max(left - 1, 0)
    )
    expect(
      _get(newInvitationData, 'viewer.status.invitation.sent.0.email')
    ).toBe(unregisterEmail)

    // register user
    const { data: registerData } = await registerUser({
      email: unregisterEmail,
      displayName: 'new test user',
      password: '567',
      codeId: '123'
    })
    expect(_get(registerData, 'userRegister.token')).toBeTruthy()

    // check user state
    const user = await userService.findByEmail(unregisterEmail)
    expect(user.state).toBe('active')

    // check transactions
    const senderTxs = await userService.findTransactionsByUserId(
      fromGlobalId(_get(newInvitationData, 'viewer.id')).id
    )
    const recipientTxs = await userService.findTransactionsByUserId(user.id)
    expect(senderTxs[0].amount).toBe(MAT_UNIT.invitationAccepted)
    expect(senderTxs[0].purpose).toBe(TRANSACTION_PURPOSE.invitationAccepted)
    expect(recipientTxs[0].amount).toBe(MAT_UNIT.joinByInvitation)
    expect(recipientTxs[0].purpose).toBe(TRANSACTION_PURPOSE.joinByInvitation)
  })

  test('admin is not limit on invitations', async () => {
    const invitationData = await getUserInvitation(true)
    const left = _get(invitationData, 'viewer.status.invitation.left')
    expect(left).toBeLessThanOrEqual(0)

    const { mutate } = await testClient({
      isAuth: true,
      isAdmin: true
    })
    const { data: invitedData, errors } = await mutate({
      mutation: INVITE,
      // @ts-ignore
      variables: {
        input: {
          email: `test-new-${Math.floor(
            Math.random() * 100
          )}@matters.admin.news`
        }
      }
    })

    if (errors) {
      throw errors
    }

    expect(invitedData.invite).toBe(true)
  })
})
