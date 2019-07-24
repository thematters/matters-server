require('newrelic')
require('module-alias/register')
require('dotenv').config()
// external
import http from 'http'
import * as Sentry from '@sentry/node'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

// local
import * as routes from './routes'
// internal
import { environment } from 'common/environment'
import scheduleQueue from 'connectors/queue/schedule'
import { CORS_OPTIONS } from 'common/enums'

/**
 * Init
 */
Sentry.init({ dsn: environment.sentryDsn || '' })
scheduleQueue.start()
const PORT = 4000
const app = express()
const httpServer = http.createServer(app)

/**
 * Middlewares
 */
app.use(helmet())
app.use(cors(CORS_OPTIONS))

/**
 * Routes
 *
 * @see {@url https://www.apollographql.com/docs/apollo-server
/features/subscriptions/#subscriptions-with-additional-middleware}
 */
// GraphQL
const server = routes.graphql(app)
server.installSubscriptionHandlers(httpServer)

// OAuth
app.use('/oauth', routes.oauth)

httpServer.listen(PORT, () => {
  console.log(
    `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
  )
  console.log(
    `🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`
  )
})
