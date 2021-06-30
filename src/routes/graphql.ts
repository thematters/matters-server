import { responseCachePlugin } from '@matters/apollo-response-cache'
import { RedisCache } from 'apollo-server-cache-redis'
import { ApolloServer, GraphQLOptions } from 'apollo-server-express'
import bodyParser from 'body-parser'
import { Express, Request, Response } from 'express'
import costAnalysis from 'graphql-cost-analysis'
import depthLimit from 'graphql-depth-limit'
import { applyMiddleware } from 'graphql-middleware'
import expressPlayground from 'graphql-playground-middleware-express'
import _ from 'lodash'
import 'module-alias/register'

import {
  CACHE_TTL,
  CORS_OPTIONS,
  GRAPHQL_COST_LIMIT,
  UPLOAD_FILE_COUNT_LIMIT,
  UPLOAD_FILE_SIZE_LIMIT,
} from 'common/enums'
import { environment, isProd } from 'common/environment'
import { ActionLimitExceededError } from 'common/errors'
import logger from 'common/logger'
import { initSubscriptions, makeContext } from 'common/utils'
import {
  ArticleService,
  AtomService,
  CommentService,
  DraftService,
  NotificationService,
  OAuthService,
  PaymentService,
  SystemService,
  TagService,
  UserService,
} from 'connectors'
import { sentryMiddleware } from 'middlewares/sentry'

import schema from '../schema'

const API_ENDPOINT = '/graphql'
const PLAYGROUND_ENDPOINT = '/playground'

class ProtectedApolloServer extends ApolloServer {
  async createGraphQLServerOptions(
    req: Request,
    res: Response
  ): Promise<GraphQLOptions> {
    const options = await super.createGraphQLServerOptions(req, res)
    const maximumCost = GRAPHQL_COST_LIMIT

    return {
      ...options,
      validationRules: [
        ...(options.validationRules || []),
        costAnalysis({
          variables: req.body.variables,
          maximumCost,
          defaultCost: 1,
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
            ),
        }),
      ],
    }
  }
}

const cache = new RedisCache({
  host: environment.cacheHost,
  port: environment.cachePort,
})

const composedSchema = applyMiddleware(schema, sentryMiddleware)

const server = new ProtectedApolloServer({
  schema: composedSchema,
  context: makeContext,
  engine: {
    apiKey: environment.apiKey,
  },
  subscriptions: initSubscriptions(),
  dataSources: () => ({
    atomService: new AtomService(),

    // below services will be deprecated
    userService: new UserService(),
    articleService: new ArticleService(),
    commentService: new CommentService(),
    draftService: new DraftService(),
    systemService: new SystemService(),
    tagService: new TagService(),
    notificationService: new NotificationService(),
    oauthService: new OAuthService(),
    paymentService: new PaymentService(),
  }),
  uploads: {
    maxFileSize: UPLOAD_FILE_SIZE_LIMIT,
    maxFiles: UPLOAD_FILE_COUNT_LIMIT,
  },
  debug: !isProd,
  validationRules: [depthLimit(15)],
  cache,
  persistedQueries: {
    cache,
  },
  cacheControl: {
    calculateHttpHeaders: false,
    defaultMaxAge: CACHE_TTL.PUBLIC_QUERY,
    stripFormattedExtensions: isProd,
  },
  plugins: [
    responseCachePlugin({
      sessionId: ({ context }) => {
        const viewerId = _.get(context, 'viewer.id', '')
        const viewerGroup = _.get(context, 'viewer.group', '')
        return JSON.stringify({ id: viewerId, group: viewerGroup })
      },
      nodeFQCTTL: CACHE_TTL.PUBLIC_QUERY,
    }),
  ],
  introspection: true,
  playground: false, // enabled below
})

export const graphql = (app: Express) => {
  app.use(API_ENDPOINT, bodyParser.json({ limit: '512kb' }))

  // API
  server.applyMiddleware({
    app,
    path: API_ENDPOINT,
    cors: CORS_OPTIONS,
  })

  // Playground
  app.get(
    PLAYGROUND_ENDPOINT,
    expressPlayground({
      endpoint: API_ENDPOINT,
      settings: {
        // @ts-ignore
        'schema.polling.enable': false,
      },
    })
  )

  return server
}
