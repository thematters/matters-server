require('newrelic')
require('module-alias/register')
require('dotenv').config()
// external
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
const app = express()

/**
 * Middlewares
 */
app.use(helmet())
app.use(cors(CORS_OPTIONS))

/**
 * Routes
 */
const server = routes.graphql(app)

app.use('/oauth', routes.oauth)

app.listen({ port: 4000 }, () => {
  console.log(`🚀 Server ready at ${server.graphqlPath}`)
})
