import './fetch-polyfill.js'

import { CORS_OPTIONS, LOGGING_CONTEXT_KEY } from '#common/enums/index.js'
import { contextStorage, LoggingContextKey } from '#common/logger.js'
import * as Sentry from '@sentry/node'
import cors from 'cors'
import express, { RequestHandler } from 'express'
import helmet from 'helmet'
import { createRequire } from 'node:module'
import requestIp from 'request-ip'
import { v4 } from 'uuid'

const require = createRequire(import.meta.url)
import { environment, isLocal, isProd } from './common/environment.js'
import * as routes from './routes/index.js'

const { version } = require('../package.json')

//

;(async () => {
  /**
   * Init
   */

  // Sentry
  Sentry.init({
    enabled: !isLocal,
    dsn: environment.sentryDsn,
    release: version,
    sampleRate: isLocal ? 1 : 0.1,
    environment: isProd ? 'production' : 'development',
    debug: isLocal,

    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
  })

  // Express
  const PORT = 4000
  const app = express()
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])

  /**
   * Middlewares
   */
  // store request-id in AsyncLocalStorage
  app.use((req, _, next) => {
    const traceId = req.header('x-trace-id')
    const context = new Map<LoggingContextKey, string>()
    context.set(LOGGING_CONTEXT_KEY.requestId, traceId ?? v4())
    context.set(LOGGING_CONTEXT_KEY.ip, requestIp.getClientIp(req) ?? '')
    context.set(LOGGING_CONTEXT_KEY.userAgent, req.header('user-agent') ?? '')
    contextStorage.enterWith(context)
    next()
  })
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: false,
    }) as RequestHandler
  )
  app.use(requestIp.mw())
  app.use(cors(CORS_OPTIONS))

  /**
   * Routes
   *
   */
  // GraphQL
  await routes.graphql(app)

  // OAuth
  app.use('/oauth', routes.oauth)

  // Pay
  app.use('/pay', routes.pay)

  // Facebook Data Deletion Request Callback
  // see https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
  app.use('/facebook', routes.facebook)

  // Sentry error handler
  Sentry.setupExpressErrorHandler(app)

  await new Promise((resolve) =>
    app.listen({ port: PORT }, resolve as () => void)
  )
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`)
})()
