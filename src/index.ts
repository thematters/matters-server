require('newrelic')
require('module-alias/register')
require('dotenv').config()
// external
import * as Sentry from '@sentry/node'
import express from 'express'

// local
import * as routes from './routes'
// internal
import { environment } from 'common/environment'
import scheduleQueue from 'connectors/queue/schedule'

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

app.use('/oauth', routes.oauth)

app.listen({ port: 4000 }, () => {
  console.log(`🚀 Server ready at ${server.graphqlPath}`)
})
