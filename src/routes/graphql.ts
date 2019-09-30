import {
  RenderPageOptions as PlaygroundRenderPageOptions,
  renderPlaygroundPage
} from '@apollographql/graphql-playground-html'
import * as Sentry from '@sentry/node'
import { RedisCache } from 'apollo-server-cache-redis'
import { ApolloServer, GraphQLOptions } from 'apollo-server-express'
import express, { Express } from 'express'
import costAnalysis from 'graphql-cost-analysis'
import depthLimit from 'graphql-depth-limit'
import { applyMiddleware } from 'graphql-middleware'
import _ from 'lodash'
import 'module-alias/register'
import 'newrelic'

import { CACHE_TTL, CORS_OPTIONS, UPLOAD_FILE_SIZE_LIMIT } from 'common/enums'
import { environment, isProd } from 'common/environment'
import { ActionLimitExceededError } from 'common/errors'
import logger from 'common/logger'
import { initSubscriptions, makeContext } from 'common/utils'
import {
  ArticleService,
  CommentService,
  DraftService,
  NotificationService,
  OAuthService,
  SystemService,
  TagService,
  UserService
} from 'connectors'
import responseCachePlugin from 'middlewares/responseCachePlugin'
import { scopeMiddleware } from 'middlewares/scope'

import costMap from '../costMap'
import schema from '../schema'

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
  dataSources: () => ({
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
