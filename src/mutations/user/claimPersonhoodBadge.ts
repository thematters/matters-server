import type { GQLMutationResolvers } from '#definitions/index.js'

import { environment } from '#common/environment.js'
import { ForbiddenError, ServerError, UserInputError } from '#common/errors.js'
import jwt, { type JwtPayload } from 'jsonwebtoken'

const TOKEN_TYPE = 'personhood_handoff'

type VerifyResponse = {
  verified?: unknown
  nullifier?: unknown
  parsed_inputs?: {
    challenge?: unknown
  }
  challenge?: {
    expected?: unknown
    observed?: unknown
    match?: unknown
  }
  reason?: unknown
  error?: unknown
}

type HandoffToken = JwtPayload & {
  challenge?: unknown
  type?: unknown
}

const resolver: GQLMutationResolvers['claimPersonhoodBadge'] = async (
  _,
  { input: { certChainProof, certChainType, handoffToken, userSigProof } },
  { dataSources: { atomService } }
) => {
  if (!environment.personhoodVerifierUrl) {
    throw new ServerError('personhood verifier is not configured')
  }

  const token = verifyHandoffToken(handoffToken)
  if (!token.sub || typeof token.challenge !== 'string') {
    throw new ForbiddenError('invalid personhood handoff token')
  }

  const result = await verifyProof({
    certChainProof,
    certChainType: certChainType || 'rs4096',
    userSigProof,
  })

  if (result.verified !== true) {
    const reason =
      typeof result.reason === 'string'
        ? result.reason
        : typeof result.error === 'string'
          ? result.error
          : 'personhood proof verification failed'
    throw new UserInputError(reason)
  }

  const observedChallenge = getObservedChallenge(result)
  if (observedChallenge !== token.challenge) {
    throw new ForbiddenError('personhood challenge mismatch')
  }

  await atomService.upsert({
    table: 'user_badge',
    where: { userId: token.sub, type: 'carbon_based' },
    create: {
      enabled: true,
      type: 'carbon_based',
      userId: token.sub,
    },
    update: {
      enabled: true,
    },
  })

  return atomService.findUnique({
    table: 'user',
    where: { id: token.sub },
  })
}

const verifyHandoffToken = (handoffToken: string): HandoffToken => {
  try {
    const token = jwt.verify(
      handoffToken,
      environment.jwtSecret
    ) as HandoffToken
    if (token.type !== TOKEN_TYPE) {
      throw new Error('unexpected token type')
    }
    return token
  } catch {
    throw new ForbiddenError('invalid personhood handoff token')
  }
}

const verifyProof = async ({
  certChainProof,
  certChainType,
  userSigProof,
}: {
  certChainProof: string
  certChainType: string
  userSigProof: string
}) => {
  const response = await fetch(
    `${environment.personhoodVerifierUrl.replace(/\/$/, '')}/link-verify`,
    {
      body: JSON.stringify({
        cert_chain_proof: certChainProof,
        cert_chain_type: certChainType,
        user_sig_proof: userSigProof,
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    }
  )

  const text = await response.text()
  let body: VerifyResponse
  try {
    body = JSON.parse(text) as VerifyResponse
  } catch {
    throw new ServerError('invalid personhood verifier response')
  }

  if (!response.ok) {
    const message =
      typeof body.error === 'string'
        ? body.error
        : typeof body.reason === 'string'
          ? body.reason
          : 'personhood verifier rejected proof'
    throw new UserInputError(message)
  }

  return body
}

const getObservedChallenge = (result: VerifyResponse) => {
  if (typeof result.parsed_inputs?.challenge === 'string') {
    return result.parsed_inputs.challenge
  }
  if (typeof result.challenge?.observed === 'string') {
    return result.challenge.observed
  }
  if (typeof result.challenge?.expected === 'string') {
    return result.challenge.expected
  }
  throw new ForbiddenError('personhood challenge missing')
}

export default resolver
