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
import scheduleQueue from 'connectors/queue/schedule'

/**
 * Init
 */
Sentry.init({ dsn: environment.sentryDsn || '' })
scheduleQueue.start()

/**
 * Middlewares
 */
const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

/**
 * Routes
 */
const server = routes.graphql(app)

const oauthService = new OAuthService()
const oauth = new OAuthServer({
  model: {
    generateAccessToken: oauthService.generateAccessToken,
    generateRefreshToken: oauthService.generateRefreshToken,
    generateAuthorizationCode: oauthService.generateAuthorizationCode,
    getAuthorizationCode: oauthService.getAuthorizationCode,
    getClient: oauthService.getClient,
    saveToken: oauthService.saveToken,
    saveAuthorizationCode: oauthService.saveAuthorizationCode,
    revokeAuthorizationCode: oauthService.revokeAuthorizationCode,
    validateScope: oauthService.validateScope,
    getAccessToken: oauthService.getAccessToken,
    verifyScope: oauthService.verifyScope
  }
})
app.use('/oauth/authorize', oauth.authorize())
app.use('/oauth/access_token', oauth.token())

app.listen({ port: 4000 }, () => {
  console.log(`🚀 Server ready at ${server.graphqlPath}`)
})
