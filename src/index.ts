import cors from 'cors'
import express, { RequestHandler } from 'express'
import helmet from 'helmet'
import 'module-alias/register'
import requestIp from 'request-ip'
import { v4 } from 'uuid'

import { CORS_OPTIONS, LOGGING_CONTEXT_KEY } from 'common/enums'
import { contextStorage, LoggingContextKey } from 'common/logger'

import * as routes from './routes'
;(async () => {
  /**
   * Init
   */

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

  await new Promise((resolve) =>
    app.listen({ port: PORT }, resolve as () => void)
  )
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`)
})()
