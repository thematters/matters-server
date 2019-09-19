require('newrelic')
require('module-alias/register')
require('dotenv').config()

// external
import * as Sentry from '@sentry/node'
import _ from 'lodash'
import express, { Express } from 'express'
import { ApolloServer, GraphQLOptions } from 'apollo-server-express'
import costAnalysis from 'graphql-cost-analysis'
import depthLimit from 'graphql-depth-limit'
import { RedisCache } from 'apollo-server-cache-redis'
import {
  renderPlaygroundPage,
  RenderPageOptions as PlaygroundRenderPageOptions
} from '@apollographql/graphql-playground-html'
import { applyMiddleware } from 'graphql-middleware'

// internal
import logger from 'common/logger'
import { UPLOAD_FILE_SIZE_LIMIT, CORS_OPTIONS, CACHE_TTL } from 'common/enums'
import { environment, isProd } from 'common/environment'
import { DataSources } from 'definitions'
import { makeContext, initSubscriptions } from 'common/utils'
import {
  ArticleService,
  CommentService,
  DraftService,
  SystemService,
  TagService,
  UserService,
  NotificationService,
  OAuthService
} from 'connectors'
import { ActionLimitExceededError } from 'common/errors'
import { scopeMiddleware } from 'middlewares/scope'
import responseCachePlugin from 'middlewares/responseCachePlugin'

// local
import schema from '../schema'
import costMap from '../costMap'

const API_ENDPOINT = '/graphql'
const PLAYGROUND_ENDPOINT = '/playground'

class ProtectedApolloServer extends ApolloServer {
  async createGraphQLServerOptions(
    req: express.Request,
    res: express.Response
  ): Promise<GraphQLOptions> {
    const options = await super.createGraphQLServerOptions(req, res)
    const maximumCost = 500

    return {
      ...options,
      validationRules: [
        ...(options.validationRules || []),
        costAnalysis({
          variables: req.body.variables,
          maximumCost,
          defaultCost: 1,
          costMap,
          createError: (max: number, actual: number) => {
            const err = new ActionLimitExceededError(
              `GraphQL query exceeds maximum complexity,` +
                `please remove some nesting or fields and try again. (max: ${max}, actual: ${actual})`
            )
            return err
          },
          onComplete: (costs: number) =>
            logger.info(
              `[graphql-cost-analysis] costs: ${costs} (max: ${maximumCost})`
            )
        })
      ]
    }
  }
}

const redisCache = new RedisCache({
  host: environment.cacheHost,
  port: environment.cachePort
})

const composedSchema = applyMiddleware(schema, scopeMiddleware)

const server = new ProtectedApolloServer({
  schema: composedSchema,
  context: makeContext,
  engine: {
    apiKey: environment.apiKey
  },
  subscriptions: initSubscriptions(),
  dataSources: (): DataSources => ({
    userService: new UserService(),
    articleService: new ArticleService(),
    commentService: new CommentService(),
    draftService: new DraftService(),
    systemService: new SystemService(),
    tagService: new TagService(),
    notificationService: new NotificationService(),
    oauthService: new OAuthService()
  }),
  uploads: {
    maxFileSize: UPLOAD_FILE_SIZE_LIMIT,
    maxFiles: 10
  },
  debug: !isProd,
  formatError: (error: any) => {
    // catch error globally
    Sentry.captureException(error)
    return error
  },
  validationRules: [depthLimit(15)],
  cache: redisCache,
  persistedQueries: {
    cache: redisCache
  },
  cacheControl: {
    calculateHttpHeaders: true,
    defaultMaxAge: CACHE_TTL.DEFAULT,
    stripFormattedExtensions: isProd
  },
  plugins: [
    responseCachePlugin({
      sessionId: ({ context }) => _.get(context, 'viewer.id', null)
    })
  ],
  playground: false
})

export const graphql = (app: Express) => {
  // API
  server.applyMiddleware({
    app,
    path: API_ENDPOINT,
    cors: CORS_OPTIONS
  })

  // Playground
  app.get(PLAYGROUND_ENDPOINT, (req, res, next) => {
    const playgroundRenderPageOptions: PlaygroundRenderPageOptions = {
      endpoint: API_ENDPOINT
    }
    res.setHeader('Content-Type', 'text/html')
    const playground = renderPlaygroundPage(playgroundRenderPageOptions)
    res.write(playground)
    res.end()
    return
  })

  return server
}
