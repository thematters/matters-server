require('newrelic')
require('module-alias/register')
require('dotenv').config()
// external
import * as Sentry from '@sentry/node'
import express from 'express'
import OAuthServer from 'express-oauth-server'
import bodyParser from 'body-parser'

// local
import * as routes from './routes'
// internal
import { OAuthService } from 'connectors'
import { environment } from 'common/environment'
import { getViewerFromReq } from 'common/utils/getViewer'
import scheduleQueue from 'connectors/queue/schedule'
import {
  OAUTH_AUTHORIZATION_TOKEN_EXPIRES_IN,
  OAUTH_ACCESS_TOKEN_EXPIRES_IN,
  OAUTH_REFRESH_TOKEN_EXPIRES_IN
} from 'common/enums'

/**
 * Init
 */
Sentry.init({ dsn: environment.sentryDsn || '' })
scheduleQueue.start()

/**
 * Routes
 */
const app = express()
const server = routes.graphql(app)

const oauthService = new OAuthService()
const oauth = new OAuthServer({
  model: {
    generateAccessToken: oauthService.generateAccessToken,
    generateRefreshToken: oauthService.generateRefreshToken,
    getAuthorizationCode: oauthService.getAuthorizationCode,
    getClient: oauthService.getClient,
    saveToken: oauthService.saveToken,
    saveAuthorizationCode: oauthService.saveAuthorizationCode,
    revokeAuthorizationCode: oauthService.revokeAuthorizationCode,
    validateScope: oauthService.validateScope,
    getAccessToken: oauthService.getAccessToken,
    getRefreshToken: oauthService.getRefreshToken,
    revokeToken: oauthService.revokeToken,
    verifyScope: oauthService.verifyScope
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
app.use('/oauth', bodyParser.json())
app.use('/oauth', bodyParser.urlencoded({ extended: false }))
app.get('/oauth/authorize', async (req, res, next) => {
  const loginURL = `${environment.siteDomain}/login?`
  res.redirect(loginURL)
})
app.post('/oauth/authorize', oauth.authorize())
app.use('/oauth/access_token', oauth.token())

app.listen({ port: 4000 }, () => {
  console.log(`🚀 Server ready at ${server.graphqlPath}`)
})
