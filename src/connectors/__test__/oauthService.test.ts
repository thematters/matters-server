import type { Connections } from 'definitions'

import _ from 'lodash'

import { SCOPE_PREFIX } from 'common/enums'
import { OAuthService, AtomService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let oauthService: OAuthService

beforeAll(async () => {
  connections = await genConnections()
  oauthService = new OAuthService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const getClient = () => {
  return oauthService.getClient('test-client-id')
}

const getUser = () => {
  const atomService = new AtomService(connections)
  return atomService.userIdLoader.load('1')
}

describe('client', () => {
  test('getClient', async () => {
    const client = await getClient()
    expect(client).toBeDefined()
  })
})

describe('scope', () => {
  test('validateScope', async () => {
    const client = await getClient()
    const user = await getUser()

    if (!client) {
      throw new Error('client not found')
    }

    const validScopes = await oauthService.validateScope(
      user,
      client,
      `${SCOPE_PREFIX.query}:likerId`
    )
    expect(_.get(validScopes, 'length')).toBe(1)

    // TODO: test invalid scopes
  })
})

describe('token', () => {
  let accessToken: string
  let refreshToken: string

  test('generate', async () => {
    const client = await getClient()
    const user = await getUser()

    if (!client) {
      throw new Error('client not found')
    }

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

    if (!client) {
      throw new Error('client not found')
    }

    const token = await oauthService.saveToken(
      {
        accessToken: accessToken || 'test-token',
        refreshToken: refreshToken || 'test-token',
        client,
        user,
        scope: '',
      },
      client,
      user
    )

    expect(token.accessToken).toEqual(accessToken)
    expect(token.refreshToken).toEqual(refreshToken)
  })

  test('get', async () => {
    const newAccessToken = await oauthService.getAccessToken(accessToken)
    expect(_.get(newAccessToken, 'accessToken')).toEqual(accessToken)

    const newRefreshToken = await oauthService.getRefreshToken(refreshToken)
    expect(_.get(newRefreshToken, 'refreshToken')).toEqual(refreshToken)
  })

  test('revoke', async () => {
    const client = await getClient()
    const user = await getUser()

    if (!client) {
      throw new Error('client not found')
    }

    const revoked = await oauthService.revokeToken({
      refreshToken,
      client,
      user,
    })
    expect(revoked).toEqual(true)
  })
})
