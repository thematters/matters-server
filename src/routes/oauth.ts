// external
import OAuthServer from 'express-oauth-server'
import { Router } from 'express'
import bodyParser from 'body-parser'

// internal
import { OAuthService } from 'connectors'
import { getViewerFromReq } from 'common/utils/getViewer'
import { environment } from 'common/environment'
import {
  OAUTH_AUTHORIZATION_TOKEN_EXPIRES_IN,
  OAUTH_ACCESS_TOKEN_EXPIRES_IN,
  OAUTH_REFRESH_TOKEN_EXPIRES_IN
} from 'common/enums'

const oAuthRouter = Router()
const oAuthService = new OAuthService()
const oAuthServer = new OAuthServer({
  model: {
    generateAccessToken: oAuthService.generateAccessToken,
    generateRefreshToken: oAuthService.generateRefreshToken,
    getAuthorizationCode: oAuthService.getAuthorizationCode,
    getClient: oAuthService.getClient,
    saveToken: oAuthService.saveToken,
    saveAuthorizationCode: oAuthService.saveAuthorizationCode,
    revokeAuthorizationCode: oAuthService.revokeAuthorizationCode,
    validateScope: oAuthService.validateScope,
    getAccessToken: oAuthService.getAccessToken,
    getRefreshToken: oAuthService.getRefreshToken,
    revokeToken: oAuthService.revokeToken,
    verifyScope: oAuthService.verifyScope
  },
  allowEmptyState: true,
  authenticateHandler: {
    handle: async (req: any, res: any) => {
      const viewer = await getViewerFromReq({ req, res })

      if (!viewer.id) {
        return false
      }

      return viewer
    }
  },
  authorizationCodeLifetime: OAUTH_AUTHORIZATION_TOKEN_EXPIRES_IN / 1000,
  accessTokenLifetime: OAUTH_ACCESS_TOKEN_EXPIRES_IN / 1000,
  refreshTokenLifetime: OAUTH_REFRESH_TOKEN_EXPIRES_IN / 1000
})

// Middlewares
oAuthRouter.use('/', bodyParser.json())
oAuthRouter.use('/', bodyParser.urlencoded({ extended: false }))

// Routes
oAuthRouter.get('/authorize', async (req, res, next) => {
  const loginURL = `${environment.siteDomain}/login?client_id=${req.query.client_id}&redirect_uri`
  res.redirect(loginURL)
})
oAuthRouter.post('/authorize', oAuthServer.authorize())

oAuthRouter.use('/access_token', oAuthServer.token())

export const oauth = oAuthRouter
