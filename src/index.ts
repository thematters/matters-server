import * as Sentry from '@sentry/node'
import cors from 'cors'
import express, { RequestHandler } from 'express'
import helmet from 'helmet'
import 'module-alias/register'
import requestIp from 'request-ip'
import { v4 } from 'uuid'

import { CORS_OPTIONS, IMG_CACHE_PATH, LOGGING_CONTEXT_KEY } from 'common/enums'
import { environment } from 'common/environment'
import { contextStorage, LoggingContextKey } from 'common/logger'

import * as routes from './routes'
;(async () => {
  /**
   * Init
   */

  // Sentry
  Sentry.init({
    dsn: environment.sentryDsn,
    sampleRate: 0.1,
    ignoreErrors: [
      'ActionLimitExceededError',
      'ArticleNotFoundError',
      'ForbiddenError',
      'ForbiddenByStateError',
    ],
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

  // Image Cache Service for server side caching image, e.g. NFT images & others
  app.use(IMG_CACHE_PATH, routes.imgCache)

  await new Promise((resolve) =>
    app.listen({ port: PORT }, resolve as () => void)
  )
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`)
})()
