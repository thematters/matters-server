import type { GQLMutationResolvers } from '#definitions/index.js'

import { environment } from '#common/environment.js'
import { AuthenticationError, UserInputError } from '#common/errors.js'
import jwt from 'jsonwebtoken'

const TOKEN_TYPE = 'personhood_handoff'
const DEFAULT_TTL_SECONDS = 10 * 60

const resolver: GQLMutationResolvers['createPersonhoodHandoff'] = async (
  _,
  { input: { challenge, challengeExpiresAt } },
  { viewer }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (!challenge) {
    throw new UserInputError('"challenge" is required')
  }

  const now = Date.now()
  const challengeExpiresAtMs = challengeExpiresAt
    ? new Date(challengeExpiresAt).getTime()
    : now + DEFAULT_TTL_SECONDS * 1000

  if (!Number.isFinite(challengeExpiresAtMs) || challengeExpiresAtMs <= now) {
    throw new UserInputError('"challengeExpiresAt" is expired or invalid')
  }

  const expiresIn = Math.max(
    1,
    Math.min(
      DEFAULT_TTL_SECONDS,
      Math.floor((challengeExpiresAtMs - now) / 1000)
    )
  )
  const expiresAt = new Date(now + expiresIn * 1000)

  const token = jwt.sign(
    {
      challenge,
      type: TOKEN_TYPE,
    },
    environment.jwtSecret,
    {
      expiresIn,
      subject: viewer.id,
    }
  )

  return {
    expiresAt,
    token,
  }
}

export default resolver
