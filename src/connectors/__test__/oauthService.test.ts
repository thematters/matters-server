import { OAuthService } from '../oauthService'
import { UserService } from '../userService'

const getClient = () => {
  const oauthService = new OAuthService()
  return oauthService.getClient('test-client-id')
}
const getUser = () => {
  const userService = new UserService()
  return userService.dataloader.load('1')
}

describe('client', () => {
  test('getClient', async () => {
    const client = await getClient()
    expect(client).toBeDefined()
  })
})

describe('scope', () => {
  test('validateScope', async () => {
    const oauthService = new OAuthService()
    const client = await getClient()
    const user = await getUser()

    const validScopes = await oauthService.validateScope(
      client,
      user,
      'invalid-scope'
    )
    expect(validScopes.length).toBe(0)
  })
})

describe('token', () => {
  const oauthService = new OAuthService()
  let accessToken
  let refreshToken

  test('generate', async () => {
    const client = await getClient()
    const user = await getUser()
    // access token
    accessToken = await oauthService.generateAccessToken(client, user, '')
    expect(typeof accessToken).toEqual('string')

    // refresh token
    refreshToken = await oauthService.generateRefreshToken(client, user, '')
    expect(typeof refreshToken).toEqual('string')
  })

  test('save', async () => {
    const client = await getClient()
    const user = await getUser()
    const token = await oauthService.saveToken(
      {
        accessToken,
        refreshToken,
        client,
        user
      },
      client,
      user
    )

    expect(token.accessToken).toEqual(accessToken)
    expect(token.refreshToken).toEqual(refreshToken)
  })

  test('get', async () => {
    const newAccessToken = await oauthService.getAccessToken(accessToken)
    expect(newAccessToken.accessToken).toEqual(accessToken)

    const newRefreshToken = await oauthService.getRefreshToken(refreshToken)
    expect(newRefreshToken.refreshToken).toEqual(refreshToken)
  })

  test('reovoke', async () => {
    const client = await getClient()
    const user = await getUser()
    const revoked = await oauthService.revokeToken({
      refreshToken,
      client,
      user
    })
    expect(revoked).toEqual(true)
  })
})
