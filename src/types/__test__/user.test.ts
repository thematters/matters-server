// local
import { fromGlobalId, toGlobalId } from 'common/utils'
import { UserService } from 'connectors'
import { knex } from 'connectors/db'
import { defaultTestUser, getUserContext, testClient } from './utils'

beforeAll(async () => {
  const userService = new UserService()
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
const GET_VIEWER_INFO = `
  query {
    viewer {
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
const GET_VIEWER_MAT = `
  query {
    viewer {
      status {
        MAT
      }
    }
  }
`
const GET_VIEWER_SETTINGS = `
  query {
    viewer {
      settings {
        language
        oauthType
        notification {
          enable
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

export const registerUser = async (user: { [key: string]: string }) => {
  const { mutate } = await testClient()
  return mutate({
    mutation: USER_REGISTER,
    // @ts-ignore
    variables: { input: user }
  })
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
      code: '123'
    }
    const result = await registerUser(user)
    expect(
      result.data &&
        result.data.userRegister &&
        result.data.userRegister.auth &&
        result.data.userRegister.token
    ).toBeTruthy()

    const context = await getUserContext({ email: user.email })
    const { query } = await testClient({
      context
    })
    const newUserResult = await query({
      query: GET_VIEWER_INFO
    })
    const info =
      newUserResult.data &&
      newUserResult.data.viewer &&
      newUserResult.data.viewer.info
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
    expect(
      result.data && result.data.userLogin && !result.data.userLogin.auth
    ).toBeTruthy()
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

    expect(
      result.data && result.data.userLogin && result.data.userLogin.auth
    ).toBeTruthy()
  })

  test('retrive user info after login', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const { data } = await query({
      query: GET_VIEWER_INFO
    })
    const info = data && data.viewer && data.viewer.info
    expect(info.email).toEqual(defaultTestUser.email)
  })
})

describe('user query fields', () => {
  test('retrive user articles', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const { data } = await query({
      query: GET_VIEW_ARTICLES,
      // @ts-ignore
      variables: { input: { limit: 1 } }
    })
    const articles = data && data.viewer && data.viewer.articles
    expect(articles.length).toEqual(1)
    expect(articles[0].id).toBeDefined()
  })

  test('retrive user MAT', async () => {
    const { query } = await testClient({ isAuth: true })
    const { data } = await query({
      query: GET_VIEWER_MAT,
      // @ts-ignore
      variables: { input: {} }
    })
    const status = data && data.viewer && data.viewer.status
    expect(status.MAT).toEqual(150)
  })

  test('retrive UserSettings', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const res = await query({
      query: GET_VIEWER_SETTINGS
    })
    const { data } = res
    const settings = data && data.viewer && data.viewer.settings
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
    const subscriptions = data && data.viewer && data.viewer.subscriptions

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
    const followers = data && data.viewer && data.viewer.followers
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
    const followees = data && data.viewer && data.viewer.followees
    expect(followees.length).toEqual(1)
  })

  test('retrive UserStatus', async () => {
    const { query } = await testClient({
      isAuth: true
    })
    const { data } = await query({
      query: GET_VIEWER_STATUS
    })
    const status = data && data.viewer && data.viewer.status
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
    const followees =
      followeeData && followeeData.viewer && followeeData.viewer.followees

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
    const followeesNew =
      followeeDataNew &&
      followeeDataNew.viewer &&
      followeeDataNew.viewer.followees
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
    const info = data && data.updateUserInfo && data.updateUserInfo.info
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
    const { avatar } = data && data.updateUserInfo && data.updateUserInfo.info
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
    const enable =
      data &&
      data.updateNotificationSetting &&
      data.updateNotificationSetting.enable
    expect(enable).toBeFalsy()
  })
})

describe.only('user recommendations', () => {
  test('retrive articles from hottest, icymi and topics', async () => {
    const lists = ['hottest', 'icymi', 'topics', 'followeeArticles']
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
    const tag =
      data &&
      data.viewer &&
      data.viewer.recommendation &&
      data.viewer.recommendation.tags &&
      data.viewer.recommendation.tags[0]

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
    const author =
      data &&
      data.viewer &&
      data.viewer.recommendation &&
      data.viewer.recommendation.authors &&
      data.viewer.recommendation.authors[0]

    expect(fromGlobalId(author.id).type).toBe('User')
  })
})
