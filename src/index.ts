import * as Sentry from '@sentry/node'
import cors from 'cors'
import express, { RequestHandler } from 'express'
import helmet from 'helmet'
import requestIp from 'request-ip'

import { CORS_OPTIONS, IMG_CACHE_PATH } from 'common/enums/index.js'
import { environment } from 'common/environment.js'

import * as routes from './routes/index.js'

//
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
  app.use(helmet({ contentSecurityPolicy: false }) as RequestHandler)
  app.use(requestIp.mw())
  app.use(cors(CORS_OPTIONS))

  /**
   * Routes
   *
   */
  // GraphQL
  const server = await routes.graphql(app)

  // OAuth
  app.use('/oauth', routes.oauth)

  // Pay
  app.use('/pay', routes.pay)

  // Image Cache Service for server side caching image, e.g. NFT images & others
  app.use(IMG_CACHE_PATH, routes.imgCache)

  await new Promise((resolve) =>
    app.listen({ port: PORT }, resolve as () => void)
  )
  console.log(
    `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
  )
})()
