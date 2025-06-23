import type { Connections, User } from '#definitions/index.js'

import { jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import { Request } from 'express'

import {
  AUTH_RESULT_TYPE,
  REFRESH_TOKEN_REVOKE_REASON,
  COOKIE_ACCESS_TOKEN_NAME,
  COOKIE_REFRESH_TOKEN_NAME,
  DAY,
  MINUTE,
  NODE_TYPES,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { UserService, AtomService } from '#connectors/index.js'
import { genMD5, getTokensFromReq, toGlobalId } from '#common/utils/index.js'

import {
  defaultTestUser,
  testClient,
  genConnections,
  closeConnections,
} from '../../utils.js'

let connections: Connections
let userService: UserService
let atomService: AtomService
let testUser: User

type TokenPayload = {
  id: string
  sid: string
  exp: number
  type: 'access' | 'refresh'
}

beforeAll(async () => {
  connections = await genConnections()
  userService = new UserService(connections)
  atomService = new AtomService(connections)

  // Get test user
  testUser = (await userService.findByEmail(defaultTestUser.email)) as User
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

beforeEach(() => {
  // Reset time mocking before each test
  jest.useRealTimers()
})

afterEach(() => {
  // Clean up time mocking after each test
  jest.useRealTimers()
})

const REFRESH_TOKEN = /* GraphQL */ `
  mutation {
    refreshToken {
      type
      auth
      user {
        id
        userName
      }
      token
      accessToken
      refreshToken
    }
  }
`

describe('generateTokenPair', () => {
  test('generates valid access and refresh tokens', async () => {
    const result = await userService.generateTokenPair({
      userId: testUser.id,
      userAgent: 'test-agent',
      agentHash: 'test-hash',
    })

    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()

    // Verify access token structure
    const accessPayload = jwt.verify(
      result.accessToken,
      environment.jwtSecret
    ) as TokenPayload
    expect(accessPayload.id).toBe(testUser.id)
    expect(accessPayload.sid).toBeDefined()
    expect(accessPayload.exp).toBeDefined()

    // Verify refresh token structure
    const refreshPayload = jwt.verify(
      result.refreshToken,
      environment.jwtSecret
    ) as TokenPayload
    expect(refreshPayload.id).toBe(testUser.id)
    expect(refreshPayload.sid).toBe(accessPayload.sid) // Same session ID
    expect(refreshPayload.exp).toBeDefined()

    // Verify refresh token is stored in database
    const dbRefreshToken = await atomService.findFirst({
      table: 'refresh_token',
      where: { tokenHash: genMD5(result.refreshToken) },
    })
    expect(dbRefreshToken).toBeDefined()
    expect(dbRefreshToken.userId).toBe(testUser.id)
    expect(dbRefreshToken.userAgent).toBe('test-agent')
    expect(dbRefreshToken.agentHash).toBe('test-hash')
  })

  test('generates unique session IDs for different token pairs', async () => {
    const result1 = await userService.generateTokenPair({
      userId: testUser.id,
    })
    const result2 = await userService.generateTokenPair({
      userId: testUser.id,
    })

    const payload1 = jwt.verify(
      result1.accessToken,
      environment.jwtSecret
    ) as TokenPayload
    const payload2 = jwt.verify(
      result2.accessToken,
      environment.jwtSecret
    ) as TokenPayload

    expect(payload1.sid).not.toBe(payload2.sid)
  })
})

describe('validateTokenPair', () => {
  test('validates matching token pair', async () => {
    const { accessToken, refreshToken } = await userService.generateTokenPair({
      userId: testUser.id,
    })

    const userId = await userService.validateTokenPair(
      accessToken,
      refreshToken
    )
    expect(userId).toBe(testUser.id)
  })

  test('rejects mismatched tokens', async () => {
    const { accessToken: accessToken1 } = await userService.generateTokenPair({
      userId: testUser.id,
    })
    const { refreshToken: refreshToken2 } = await userService.generateTokenPair(
      { userId: testUser.id }
    )

    const userId = await userService.validateTokenPair(
      accessToken1,
      refreshToken2
    )
    expect(userId).toBeUndefined()
  })

  test('validates expired access token with valid refresh token', async () => {
    // Generate tokens at a specific time
    const fixedTime = new Date('2024-01-01T00:00:00Z')
    jest.useFakeTimers({ now: fixedTime })

    const { accessToken, refreshToken } = await userService.generateTokenPair({
      userId: testUser.id,
    })

    // Advance time to make access token expired but keep refresh token valid
    // Access tokens expire in 15 minutes, refresh tokens in 30 days
    jest.advanceTimersByTime(20 * MINUTE) // 20 minutes - access token expired

    const userId = await userService.validateTokenPair(
      accessToken,
      refreshToken
    )
    expect(userId).toBe(testUser.id)
  })

  test('rejects expired refresh token', async () => {
    // Generate tokens at a specific time
    const fixedTime = new Date('2024-01-01T00:00:00Z')
    jest.useFakeTimers({ now: fixedTime })

    const { accessToken, refreshToken } = await userService.generateTokenPair({
      userId: testUser.id,
    })

    // Advance time to make both tokens expired
    // Refresh tokens expire in 30 days
    jest.advanceTimersByTime(31 * DAY) // 31 days - both tokens expired

    const userId = await userService.validateTokenPair(
      accessToken,
      refreshToken
    )
    expect(userId).toBeUndefined()
  })

  test('rejects invalid tokens', async () => {
    const userId = await userService.validateTokenPair(
      'invalid-token',
      'invalid-token'
    )
    expect(userId).toBeUndefined()
  })
})

describe('getTokensFromReq', () => {
  test('extracts tokens from cookies', () => {
    const mockReq = {
      headers: {
        cookie: `${COOKIE_ACCESS_TOKEN_NAME}=access-token-value; ${COOKIE_REFRESH_TOKEN_NAME}=refresh-token-value`,
      },
    } as Request

    const { accessToken, refreshToken } = getTokensFromReq(mockReq)

    expect(accessToken).toBe('access-token-value')
    expect(refreshToken).toBe('refresh-token-value')
  })

  test('extracts tokens from headers', () => {
    const mockReq = {
      headers: {
        'x-access-token': 'header-access-token',
        'x-refresh-token': 'header-refresh-token',
      },
    } as unknown as Request

    const { accessToken, refreshToken } = getTokensFromReq(mockReq)

    expect(accessToken).toBe('header-access-token')
    expect(refreshToken).toBe('header-refresh-token')
  })

  test('returns undefined for missing tokens', () => {
    const mockReq = {
      headers: {},
    } as Request

    const { accessToken, refreshToken } = getTokensFromReq(mockReq)

    expect(accessToken).toBeUndefined()
    expect(refreshToken).toBeUndefined()
  })
})

describe('refreshToken mutation', () => {
  test('successfully refreshes valid tokens', async () => {
    // Generate initial tokens
    const { accessToken, refreshToken } = await userService.generateTokenPair({
      userId: testUser.id,
      userAgent: 'test-agent',
      agentHash: 'test-hash',
    })

    // Create mock request with tokens
    const mockReq = {
      headers: {
        cookie: `${COOKIE_ACCESS_TOKEN_NAME}=${accessToken}; ${COOKIE_REFRESH_TOKEN_NAME}=${refreshToken}`,
      },
    }

    const server = await testClient({
      connections,
      context: { viewer: testUser, req: mockReq },
    })

    const { data } = await server.executeOperation({ query: REFRESH_TOKEN })

    expect(data?.refreshToken.type).toBe(AUTH_RESULT_TYPE.TokenRefresh)
    expect(data?.refreshToken.auth).toBe(true)
    expect(data?.refreshToken.user.id).toBe(
      toGlobalId({ type: NODE_TYPES.User, id: testUser.id })
    )
    expect(data?.refreshToken.token).toBeDefined()
    expect(data?.refreshToken.accessToken).toBeDefined()
    expect(data?.refreshToken.refreshToken).toBeDefined()

    // Verify new tokens are different from old ones
    expect(data?.refreshToken.accessToken).not.toBe(accessToken)
    expect(data?.refreshToken.refreshToken).not.toBe(refreshToken)

    // Verify old refresh token is revoked
    const oldDbToken = await atomService.findFirst({
      table: 'refresh_token',
      where: { tokenHash: genMD5(refreshToken) },
    })
    expect(oldDbToken.revokedAt).toBeDefined()
    expect(oldDbToken.revokeReason).toBe(
      REFRESH_TOKEN_REVOKE_REASON.tokenRotation
    )
  })

  test('fails with missing tokens', async () => {
    const mockReq = { headers: { cookie: '' } }

    const server = await testClient({
      connections,
      context: { viewer: { id: undefined }, req: mockReq },
    })

    const { errors } = await server.executeOperation({
      query: REFRESH_TOKEN,
    })

    expect(errors?.[0].extensions.code).toBe('TOKEN_INVALID')
    expect(errors?.[0].message).toContain(
      'Access token or refresh token not found'
    )
  })

  test('fails with invalid token pair', async () => {
    const { accessToken: accessToken1 } = await userService.generateTokenPair({
      userId: testUser.id,
    })
    const { refreshToken: refreshToken2 } = await userService.generateTokenPair(
      { userId: testUser.id }
    )

    const mockReq = {
      headers: {
        cookie: `${COOKIE_ACCESS_TOKEN_NAME}=${accessToken1}; ${COOKIE_REFRESH_TOKEN_NAME}=${refreshToken2}`,
      },
    }

    const server = await testClient({
      connections,
      context: { viewer: { id: undefined }, req: mockReq },
    })

    const { errors } = await server.executeOperation({
      query: REFRESH_TOKEN,
    })

    expect(errors?.[0].extensions.code).toBe('TOKEN_INVALID')
    expect(errors?.[0].message).toContain('Invalid tokens')
  })

  test('fails with expired refresh token', async () => {
    const { accessToken, refreshToken } = await userService.generateTokenPair({
      userId: testUser.id,
    })

    // Update the token in database to be expired
    await atomService.update({
      table: 'refresh_token',
      where: { tokenHash: genMD5(refreshToken) },
      data: {
        expiredAt: new Date(Date.now() - 1000), // Expired
      },
    })

    const mockReq = {
      headers: {
        cookie: `${COOKIE_ACCESS_TOKEN_NAME}=${accessToken}; ${COOKIE_REFRESH_TOKEN_NAME}=${refreshToken}`,
      },
    }

    const server = await testClient({
      connections,
      context: { viewer: { id: undefined }, req: mockReq },
    })

    const { errors } = await server.executeOperation({
      query: REFRESH_TOKEN,
    })

    expect(errors?.[0].extensions.code).toBe('TOKEN_INVALID')
    expect(errors?.[0].message).toContain('Refresh token expired')
  })

  test('fails and revokes all tokens when refresh token is reused', async () => {
    // Generate 3 tokens for the same user
    const { accessToken, refreshToken } = await userService.generateTokenPair({
      userId: testUser.id,
    })
    const { refreshToken: refreshToken2 } = await userService.generateTokenPair(
      {
        userId: testUser.id,
      }
    )
    const { refreshToken: refreshToken3 } = await userService.generateTokenPair(
      {
        userId: testUser.id,
      }
    )

    // Mark the first refresh token as already revoked (simulating reuse)
    await atomService.update({
      table: 'refresh_token',
      where: { tokenHash: genMD5(refreshToken) },
      data: {
        revokeReason: REFRESH_TOKEN_REVOKE_REASON.tokenRotation,
        revokedAt: new Date(),
      },
    })

    const mockReq = {
      headers: {
        cookie: `${COOKIE_ACCESS_TOKEN_NAME}=${accessToken}; ${COOKIE_REFRESH_TOKEN_NAME}=${refreshToken}`,
      },
    }

    const server = await testClient({
      connections,
      context: { viewer: { id: undefined }, req: mockReq },
    })

    const { errors } = await server.executeOperation({
      query: REFRESH_TOKEN,
    })

    expect(errors?.[0].extensions.code).toBe('TOKEN_INVALID')
    expect(errors?.[0].message).toContain('Token has been used before')

    // Verify all user tokens are revoked
    const revokedTokens = await atomService.findMany({
      table: 'refresh_token',
      whereIn: ['tokenHash', [genMD5(refreshToken2), genMD5(refreshToken3)]],
    })

    // All should be revoked due to security measure
    expect(revokedTokens.every((token) => token.revokedAt)).toBe(true)
    expect(
      revokedTokens.every(
        (token) =>
          token.revokeReason === REFRESH_TOKEN_REVOKE_REASON.tokenReused
      )
    ).toBe(true)
  })

  test('fails with non-existent refresh token in database', async () => {
    const sessionId = 'test-session'
    const accessToken = jwt.sign(
      {
        id: testUser.id,
        sid: sessionId,
        exp: Math.floor(new Date().getTime() / 1000) + 3600,
      },
      environment.jwtSecret
    )
    const refreshToken = jwt.sign(
      {
        id: testUser.id,
        sid: sessionId,
        exp: Math.floor(new Date().getTime() / 1000) + 3600,
      },
      environment.jwtSecret
    )

    const mockReq = {
      headers: {
        cookie: `${COOKIE_ACCESS_TOKEN_NAME}=${accessToken}; ${COOKIE_REFRESH_TOKEN_NAME}=${refreshToken}`,
      },
    }

    const server = await testClient({
      connections,
      context: { viewer: { id: undefined }, req: mockReq },
    })

    const { errors } = await server.executeOperation({
      query: REFRESH_TOKEN,
    })

    expect(errors?.[0].extensions.code).toBe('TOKEN_INVALID')
    expect(errors?.[0].message).toContain('Refresh token not found')
  })

  test('different users cannot use each other tokens', async () => {
    // Create another user
    const anotherUser = await userService.create({
      email: 'another@test.com',
      emailVerified: true,
    })

    const { accessToken, refreshToken } = await userService.generateTokenPair({
      userId: testUser.id,
    })

    const mockReq = {
      headers: {
        cookie: `${COOKIE_ACCESS_TOKEN_NAME}=${accessToken}; ${COOKIE_REFRESH_TOKEN_NAME}=${refreshToken}`,
      },
    }

    const server = await testClient({
      connections,
      context: { viewer: anotherUser, req: mockReq },
    })

    const { errors } = await server.executeOperation({
      query: REFRESH_TOKEN,
    })

    expect(errors?.[0].extensions.code).toBe('TOKEN_INVALID')
    expect(errors?.[0].message).toContain('Invalid user')
  })
})
