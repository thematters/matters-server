import { OAuthService } from '../oauthService'
import { UserService } from '../userService'

import { knex } from 'connectors/db'
import { sharedQueueOpts } from 'connectors/queue/utils'

afterAll(async () => {
  await knex.destroy()
  const redisClient = sharedQueueOpts.createClient()
  // TODO: still have asynchronous operations running
  redisClient.disconnect()
})

const getClient = () => {
  const oauthService = new OAuthService()
  return oauthService.getClient('test-client-id')
}
const getUser = () => {
  const userService = new UserService()
  return userService.dataloader.load('1')
}

describe('client', async () => {
  test('getClient', async () => {
    const client = await getClient()
    expect(client).toBeDefined()
  })
})

describe('scope', async () => {
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

describe('token', async () => {
  const oauthService = new OAuthService()
  const client = await getClient()
  const user = await getUser()
  let accessToken
  let refreshToken

  test('generate', async () => {
    // access token
    accessToken = await oauthService.generateAccessToken(client, user, '')
    expect(typeof accessToken).toEqual('string')

    // refresh token
    refreshToken = await oauthService.generateRefreshToken(client, user, '')
    expect(typeof refreshToken).toEqual('string')
  })

  test('save', async () => {
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
    const revoked = await oauthService.revokeToken(refreshToken)
    expect(revoked).toEqual(true)
  })
})
