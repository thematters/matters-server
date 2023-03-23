import { responseCachePlugin } from '@matters/apollo-response-cache'
import { RedisCache } from 'apollo-server-cache-redis'
import {
  ApolloServerPluginCacheControl,
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginUsageReporting,
} from 'apollo-server-core'
import { ApolloServer, GraphQLOptions } from 'apollo-server-express'
import bodyParser from 'body-parser'
import { Express, RequestHandler } from 'express'
import costAnalysis from 'graphql-cost-analysis'
import depthLimit from 'graphql-depth-limit'
import { applyMiddleware } from 'graphql-middleware'
import expressPlayground from 'graphql-playground-middleware-express'
import { graphqlUploadExpress } from 'graphql-upload'
import _ from 'lodash'

import {
  CACHE_TTL,
  CORS_OPTIONS,
  GRAPHQL_COST_LIMIT,
  UPLOAD_FILE_COUNT_LIMIT,
  UPLOAD_FILE_SIZE_LIMIT,
} from 'common/enums/index.js'
import { environment, isProd } from 'common/environment.js'
import { ActionLimitExceededError } from 'common/errors.js'
import logger from 'common/logger.js'
import { makeContext } from 'common/utils/index.js'
import {
  ArticleService,
  AtomService,
  CommentService,
  DraftService,
  NotificationService,
  OAuthService,
  OpenSeaService,
  PaymentService,
  SystemService,
  TagService,
  UserService,
} from 'connectors/index.js'
import { sentryMiddleware } from 'middlewares/sentry.js'

import schema from '../schema.js'

const API_ENDPOINT = '/graphql'
const PLAYGROUND_ENDPOINT = '/playground'

class ProtectedApolloServer extends ApolloServer {
  async createGraphQLServerOptions(
    req: any,
    res: any
  ): Promise<GraphQLOptions> {
    const options = await super.createGraphQLServerOptions(
      req as any,
      res as any
    )
    const maximumCost = GRAPHQL_COST_LIMIT

    return {
      ...options,
      validationRules: [
        ...(options.validationRules || []),
        // @ts-ignore
        costAnalysis.default({
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

const exceptVariableNames = [
  'email',
  'password',
  'codeId',
  'token',
  'ethAddress',
  'signature',
  'nonce',
  'content',
]

const server = new ProtectedApolloServer({
  schema: composedSchema,
  context: makeContext,
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
    openseaService: new OpenSeaService(),
  }),
  debug: !isProd,
  validationRules: [depthLimit(15)],
  cache,
  persistedQueries: {
    cache,
  },
  plugins: [
    ApolloServerPluginUsageReporting({
      sendVariableValues: {
        transform: ({ variables }) => {
          variables = {
            ..._.omit(variables, exceptVariableNames),
            ...(variables.input
              ? { input: _.omit(variables.input, exceptVariableNames) }
              : {}),
          }
          return variables
        },
      },
    }),
    ApolloServerPluginLandingPageDisabled(),
    ApolloServerPluginCacheControl({
      calculateHttpHeaders: false,
      defaultMaxAge: CACHE_TTL.PUBLIC_QUERY,
    }),
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
})

export const graphql = async (app: Express) => {
  await server.start()

  app.use(
    API_ENDPOINT,
    graphqlUploadExpress({
      maxFileSize: UPLOAD_FILE_SIZE_LIMIT,
      maxFiles: UPLOAD_FILE_COUNT_LIMIT,
    }),
    bodyParser.json({ limit: '512kb' }) as RequestHandler
  )

  // API
  server.applyMiddleware({
    app,
    path: API_ENDPOINT,
    cors: CORS_OPTIONS,
  })

  // Playground
  app.get(
    PLAYGROUND_ENDPOINT,
    // @ts-ignore
    expressPlayground.default({
      endpoint: API_ENDPOINT,
      // @ts-ignore
      settings: {
        'schema.polling.enable': false,
      },
    })
  )

  return server
}
