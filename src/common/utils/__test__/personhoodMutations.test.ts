import { jest } from '@jest/globals'
import jwt from 'jsonwebtoken'

import { environment } from '#common/environment.js'
import { ForbiddenError, ServerError, UserInputError } from '#common/errors.js'
import claimPersonhoodBadge from '#mutations/user/claimPersonhoodBadge.js'
import createPersonhoodHandoff from '#mutations/user/createPersonhoodHandoff.js'

const originalVerifierUrl = environment.personhoodVerifierUrl
const originalFetch = global.fetch

const makeVerifierResponse = ({
  body,
  ok = true,
}: {
  body: string
  ok?: boolean
}) =>
  ({
    ok,
    text: async () => body,
  } as Response)

const runCreateHandoff = (
  input: { challenge?: string; challengeExpiresAt?: string },
  viewer: { id?: string } = { id: '42' }
) => (createPersonhoodHandoff as any)(null, { input }, { viewer }, {} as any)

const runClaimBadge = (
  input: Record<string, unknown>,
  atomService: Record<string, unknown> = {
    findUnique: jest.fn(async () => ({ id: '42' })),
    upsert: jest.fn(),
  }
) =>
  (claimPersonhoodBadge as any)(
    null,
    { input },
    { dataSources: { atomService } },
    {} as any
  )

describe('personhood mutations', () => {
  afterEach(() => {
    environment.personhoodVerifierUrl = originalVerifierUrl
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  test('creates a short-lived handoff token', async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString()

    const result = await runCreateHandoff({
      challenge: 'challenge-1',
      challengeExpiresAt: expiresAt,
    })

    const decoded = jwt.verify(
      result.token,
      environment.jwtSecret
    ) as jwt.JwtPayload
    expect(decoded.sub).toBe('42')
    expect(decoded.type).toBe('personhood_handoff')
    expect(decoded.challenge).toBe('challenge-1')
    expect(result.expiresAt).toBeInstanceOf(Date)
  })

  test('rejects invalid handoff input', async () => {
    await expect(
      runCreateHandoff({ challenge: 'challenge-1' }, {})
    ).rejects.toThrow('visitor has no permission')
    await expect(runCreateHandoff({ challenge: '' })).rejects.toThrow(
      '"challenge" is required'
    )
    await expect(
      runCreateHandoff({
        challenge: 'challenge-1',
        challengeExpiresAt: new Date(Date.now() - 1000).toISOString(),
      })
    ).rejects.toThrow('"challengeExpiresAt" is expired or invalid')
  })

  test('claims the carbon based badge after proof verification', async () => {
    environment.personhoodVerifierUrl = 'https://verifier.example'
    const token = jwt.sign(
      { challenge: 'challenge-1', type: 'personhood_handoff' },
      environment.jwtSecret,
      { subject: '42' }
    )
    const atomService = {
      findUnique: jest.fn(async () => ({ id: '42' })),
      upsert: jest.fn(),
    }
    global.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
      expect(url).toBe('https://verifier.example/link-verify')
      expect(JSON.parse(init?.body as string)).toEqual({
        cert_chain_proof: 'cert-proof',
        cert_chain_type: 'rs4096',
        user_sig_proof: 'sig-proof',
      })
      return makeVerifierResponse({
        body: JSON.stringify({
          parsed_inputs: { challenge: 'challenge-1' },
          verified: true,
        }),
      })
    }) as typeof fetch

    await expect(
      runClaimBadge(
        {
          certChainProof: 'cert-proof',
          handoffToken: token,
          userSigProof: 'sig-proof',
        },
        atomService
      )
    ).resolves.toEqual({ id: '42' })

    expect(atomService.upsert).toHaveBeenCalledWith({
      table: 'user_badge',
      where: { type: 'carbon_based', userId: '42' },
      create: {
        enabled: true,
        type: 'carbon_based',
        userId: '42',
      },
      update: {
        enabled: true,
      },
    })
  })

  test('rejects unconfigured, invalid, failed, and mismatched proofs', async () => {
    await expect(runClaimBadge({ handoffToken: 'bad-token' })).rejects.toThrow(
      ServerError
    )

    environment.personhoodVerifierUrl = 'https://verifier.example/'
    await expect(runClaimBadge({ handoffToken: 'bad-token' })).rejects.toThrow(
      ForbiddenError
    )

    const token = jwt.sign(
      { challenge: 'challenge-1', type: 'personhood_handoff' },
      environment.jwtSecret,
      { subject: '42' }
    )

    global.fetch = jest.fn(async () =>
      makeVerifierResponse({ body: 'not json' })
    ) as typeof fetch
    await expect(
      runClaimBadge({
        certChainProof: 'cert-proof',
        handoffToken: token,
        userSigProof: 'sig-proof',
      })
    ).rejects.toThrow('invalid personhood verifier response')

    global.fetch = jest.fn(async () =>
      makeVerifierResponse({
        body: JSON.stringify({ reason: 'verifier says no' }),
        ok: false,
      })
    ) as typeof fetch
    await expect(
      runClaimBadge({
        certChainProof: 'cert-proof',
        handoffToken: token,
        userSigProof: 'sig-proof',
      })
    ).rejects.toThrow(UserInputError)

    global.fetch = jest.fn(async () =>
      makeVerifierResponse({
        body: JSON.stringify({
          challenge: { observed: 'different-challenge' },
          verified: true,
        }),
      })
    ) as typeof fetch
    await expect(
      runClaimBadge({
        certChainProof: 'cert-proof',
        handoffToken: token,
        userSigProof: 'sig-proof',
      })
    ).rejects.toThrow('personhood challenge mismatch')
  })
})
