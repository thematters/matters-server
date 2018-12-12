// external
import { graphql } from 'graphql'
// local
import schema from '../../schema'
import { makeContext } from 'common/utils'
import { knex } from 'connectors/db'
import uuid = require('uuid')

afterAll(knex.destroy)

const testUser = {
  email: 'test1@matters.news',
  password: '123'
}

const loginQuery = `
  mutation UserLogin($input: UserLoginInput!) {
    userLogin(input: $input) {
      auth
      token
    }
  }
`

const login = async ({
  email,
  password
}: {
  email: string
  password: string
}) => {
  const context = await makeContext({ req: {} })
  const { data } = await graphql(schema, loginQuery, {}, context, {
    input: { email, password }
  })

  const result = data && data.userLogin
  return result
}

const authContext = async () => {
  const { token } = await login(testUser)
  return await makeContext({
    req: { headers: { 'x-access-token': token } }
  })
}

describe('register and login functionarlities', () => {
  test('register user', async () => {
    const user = {
      email: 'test9@matters.news',
      displayName: 'test user',
      password: '567',
      code: '123'
    }

    const { code, password, ...userSanitized } = user
    const query = `
      mutation UserRegister($input: UserRegisterInput!) {
        userRegister(input: $input) {
          info {
            email
            displayName
          }
        }
      }
    `
    const context = await makeContext({ req: {} })
    const result = await graphql(schema, query, {}, context, {
      input: user
    })

    expect(result.data && result.data.userRegister).toBeTruthy()
    if (result.data && result.data.userRegister) {
      expect(result.data.userRegister.info).toMatchObject(userSanitized)
    }
  })

  test('auth fail when password is incorrect', async () => {
    const email = 'test1@matters.news'
    const password = 'wrongPassword'

    const context = await makeContext({ req: {} })
    const result = await graphql(schema, loginQuery, {}, context, {
      input: { email, password }
    })
    expect(
      result.data && result.data.userLogin && !result.data.userLogin.auth
    ).toBeTruthy()
  })

  test('auth success when password is correct', async () => {
    const email = 'test1@matters.news'
    const password = '123'

    const result = await login({ email, password })

    expect(result.auth).toBeTruthy()
  })

  test('retrive user info after login', async () => {
    const viewerQuery = `
      query ViewerQuery {
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

    const context = await authContext()
    const result = await graphql(schema, viewerQuery, {}, context)
    const { data: viewerData } = result
    const info = viewerData && viewerData.viewer && viewerData.viewer.info

    expect(info.email).toEqual(testUser.email)
  })
})

describe('user query fields', () => {
  test('retrive user articles', async () => {
    const viewerQuery = `
      query ArtilcesQuery($input: ListInput!) {
        viewer {
          articles(input: $input) {
            uuid
          }
        }
      }
    `
    const context = await authContext()
    const { data } = await graphql(schema, viewerQuery, {}, context, {
      input: { limit: 1 }
    })
    const articles = data && data.viewer && data.viewer.articles

    expect(articles.length).toEqual(1)
    expect(articles[0].uuid).toEqual('00000000-0000-0000-0000-000000000004')
  })

  test('retrive an user', async () => {
    const query = `
      query UserQuery($input: UserInput!) {
        viewer {
          user(input: $input) {
            uuid
          }
        }
      }
    `
    const uuid = '00000000-0000-0000-0000-000000000002'
    const context = await authContext()
    const { data } = await graphql(schema, query, {}, context, {
      input: { uuid }
    })
    const user = data && data.viewer && data.viewer.user
    expect(user.uuid).toEqual(uuid)
  })

  test('retrive an article', async () => {
    const query = `
      query ArticleQuery($input: ArticleInput!) {
        viewer {
          article(input: $input) {
            uuid
          }
        }
      }
    `
    const uuid = '00000000-0000-0000-0000-000000000001'
    const context = await authContext()
    const { data } = await graphql(schema, query, {}, context, {
      input: { uuid }
    })
    const article = data && data.viewer && data.viewer.article
    expect(article.uuid).toEqual(uuid)
  })

  test('retrive UserSettings', async () => {
    const viewerQuery = `
      query UserSettingsQuery {
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

    const context = await authContext()
    const { data } = await graphql(schema, viewerQuery, {}, context)
    const settings = data && data.viewer && data.viewer.settings
    expect(settings).toBeDefined()
    expect(settings.notification.enable).toBeTruthy()
  })

  test('retrive subscriptions', async () => {
    const query = `
      query UserSubscriptionsQuery($input: ListInput!) {
        viewer {
          subscriptions(input: $input) {
            uuid
          }
        }
      }
    `

    const context = await authContext()
    const { data } = await graphql(schema, query, {}, context, { input: {} })
    const subscriptions = data && data.viewer && data.viewer.subscriptions

    expect(subscriptions.length).toEqual(3)
  })

  test('retrive followers', async () => {
    const query = `
      query FlowersQuery($input: ListInput!) {
        viewer {
          followers(input: $input) {
            uuid
          }
        }
      }
    `

    const context = await authContext()
    const { data } = await graphql(schema, query, {}, context, { input: {} })
    const followers = data && data.viewer && data.viewer.followers
    expect(followers.length).toEqual(0)
  })

  test('retrive followees', async () => {
    const query = `
      query FloweesQuery($input: ListInput!) {
        viewer {
          followees(input: $input) {
            uuid
          }
        }
      }
    `

    const context = await authContext()
    const { data } = await graphql(schema, query, {}, context, { input: {} })
    const followees = data && data.viewer && data.viewer.followees
    expect(followees.length).toEqual(1)
  })

  test('retrive UserStatus', async () => {
    const query = `
      query FlowersQuery {
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

    const context = await authContext()
    const { data } = await graphql(schema, query, {}, context)
    const status = data && data.viewer && data.viewer.status
    expect(status).toMatchObject({
      articleCount: 2,
      commentCount: 2,
      followerCount: 0,
      followeeCount: 1,
      subscriptionCount: 3
    })
  })
})

describe('mutations on User object', () => {
  test('followUser', async () => {
    const followeeUuid = '00000000-0000-0000-0000-000000000003'
    const followQuery = `
      mutation FollowerUser($input: FollowUserInput!) {
        followUser(input: $input)
      }
    `

    const context = await authContext()
    const { data } = await graphql(schema, followQuery, {}, context, {
      input: { uuid: followeeUuid }
    })

    expect(data && data.followUser).toBeTruthy()

    const query = `
      query FloweesQuery($input: ListInput!) {
        viewer {
          followees(input: $input) {
            uuid
          }
        }
      }
    `
    const { data: followeeData } = await graphql(schema, query, {}, context, {
      input: {}
    })

    const followees =
      followeeData && followeeData.viewer && followeeData.viewer.followees
    expect(followees.map(({ uuid }: { uuid: string }) => uuid)).toContain(
      followeeUuid
    )
  })
})
