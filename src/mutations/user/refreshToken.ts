import type { GQLMutationResolvers, AuthMode } from '#definitions/index.js'

import {
  AUTH_RESULT_TYPE,
  REFRESH_TOKEN_REVOKE_REASON,
} from '#common/enums/index.js'
import { TokenInvalidError } from '#common/errors.js'
import {
  setCookie,
  getViewerFromUser,
  getTokensFromReq,
} from '#common/utils/index.js'

const resolver: GQLMutationResolvers['refreshToken'] = async (
  _,
  __,
  context
) => {
  const {
    viewer,
    req,
    res,
    dataSources: { userService, atomService },
  } = context

  const { accessToken, refreshToken } = getTokensFromReq(req)

  // Validate tokens
  if (!accessToken || !refreshToken) {
    throw new TokenInvalidError('Access token or refresh token not found')
  }

  const userId = await userService.validateTokenPair(accessToken, refreshToken)
  if (!userId) {
    throw new TokenInvalidError('Invalid tokens')
  }

  if (userId !== viewer.id) {
    throw new TokenInvalidError('Invalid user')
  }

  const dbRefreshToken = await atomService.findFirst({
    table: 'refresh_token',
    where: { tokenHash: refreshToken },
  })
  if (!dbRefreshToken) {
    throw new TokenInvalidError('Refresh token not found')
  }
  if (dbRefreshToken.expiredAt < new Date()) {
    await atomService.update({
      table: 'refresh_token',
      where: { tokenHash: refreshToken },
      data: {
        revokeReason: REFRESH_TOKEN_REVOKE_REASON.tokenInvalid,
        revokedAt: new Date(),
      },
    })
    throw new TokenInvalidError('Refresh token expired')
  }

  // Check if the refresh token has been used before
  if (dbRefreshToken && dbRefreshToken.revokedAt) {
    // revoke all sessions for security reason
    await atomService.updateMany({
      table: 'refresh_token',
      where: { userId: viewer.id },
      data: {
        revokeReason: REFRESH_TOKEN_REVOKE_REASON.tokenReused,
        revokedAt: new Date(),
      },
    })
    throw new TokenInvalidError('Token has been used before')
  }

  // Rotate refresh token (revoke old, create new)
  await atomService.update({
    table: 'refresh_token',
    where: { tokenHash: refreshToken },
    data: {
      revokeReason: REFRESH_TOKEN_REVOKE_REASON.tokenRotation,
      revokedAt: new Date(),
    },
  })
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await userService.generateAccessAndRefreshTokens({
      userId: viewer.id,
      userAgent: viewer.userAgent,
      agentHash: viewer.agentHash,
    })

  // Set new cookies
  setCookie({
    req,
    res,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: viewer,
  })

  // Update context viewer
  context.viewer = await getViewerFromUser(viewer)
  context.viewer.authMode = viewer.role as AuthMode
  context.viewer.scope = {}

  return {
    token: newAccessToken,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    auth: true,
    type: AUTH_RESULT_TYPE.TokenRefresh,
    user: viewer,
  }
}

export default resolver
