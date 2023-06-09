import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import { ApolloServerPluginUsageReportingDisabled } from '@apollo/server/plugin/disabled'
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting'
import { KeyvAdapter } from '@apollo/utils.keyvadapter'
import {
  ErrorsAreMissesCache,
  type KeyValueCache,
} from '@apollo/utils.keyvaluecache'
import KeyvRedis from '@keyv/redis'
import { responseCachePlugin } from '@matters/apollo-response-cache'
import ApolloServerPluginQueryComplexity from 'apollo-server-plugin-query-complexity'
import bodyParser from 'body-parser'
import cors from 'cors'
import { Express, RequestHandler } from 'express'
// import costAnalysis from 'graphql-cost-analysis'
// import depthLimit from 'graphql-depth-limit'
import { applyMiddleware } from 'graphql-middleware'
import expressPlayground from 'graphql-playground-middleware-express'
import { directiveEstimator, simpleEstimator } from 'graphql-query-complexity'
import { graphqlUploadExpress } from 'graphql-upload'
import Keyv from 'keyv'
import _ from 'lodash'
import 'module-alias/register'

import {
  CACHE_TTL,
  CORS_OPTIONS,
  GRAPHQL_COST_LIMIT,
  UPLOAD_FILE_COUNT_LIMIT,
  UPLOAD_FILE_SIZE_LIMIT,
} from 'common/enums'
import { isProd, isLocal, isTest } from 'common/environment'
// import { ActionLimitExceededError } from 'common/errors'
import { getLogger } from 'common/logger'
import { makeContext } from 'common/utils'
import { redis } from 'connectors'
import { Context } from 'definitions'
import { loggerMiddleware } from 'middlewares/logger'

import schema from '../schema'

const logger = getLogger('graphql-server')

const API_ENDPOINT = '/graphql'
const PLAYGROUND_ENDPOINT = '/playground'

const cacheBackend = new ErrorsAreMissesCache(
  new KeyvAdapter(new Keyv({ store: new KeyvRedis(redis) }))
) as KeyValueCache<string>

// class ProtectedApolloServer extends ApolloServer {
//   async createGraphQLServerOptions(
//     req: any,
//     res: any
//   ): Promise<GraphQLOptions> {
//     const options = await super.createGraphQLServerOptions(
//       req as any,
//       res as any
//     )
//     const maximumCost = GRAPHQL_COST_LIMIT
//
//     return {
//       ...options,
//       validationRules: [
//         ...(options.validationRules || []),
//         costAnalysis({
//           variables: req.body.variables,
//           maximumCost,
//           defaultCost: 1,
//           createError: (max: number, actual: number) => {
//             const err = new ActionLimitExceededError(
//               `GraphQL query exceeds maximum complexity,` +
//                 `please remove some nesting or fields and try again. (max: ${max}, actual: ${actual})`
//             )
//             return err
//           },
//           onComplete: (costs: number) =>
//             logger.debug('costs: %d (max: %d)', costs, maximumCost),
//         }),
//       ],
//     }
//   }
// }

const composedSchema = applyMiddleware(schema, loggerMiddleware)

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

const disableUsageReporting = isLocal || isTest

const server = new ApolloServer<Context>({
  schema: composedSchema,
  includeStacktraceInErrorResponses: !isProd,
  cache: cacheBackend,
  persistedQueries: {
    cache: cacheBackend,
  },
  plugins: [
    ApolloServerPluginQueryComplexity({
      estimators: [directiveEstimator(), simpleEstimator()],
      maximumComplexity: GRAPHQL_COST_LIMIT,
    }),
    disableUsageReporting
      ? ApolloServerPluginUsageReportingDisabled()
      : ApolloServerPluginUsageReporting({
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
      redis,
      sessionId: async ({ contextValue }) => {
        const viewerId = contextValue.viewer.id ?? ''
        const viewerGroup = contextValue.viewer.group ?? ''
        return JSON.stringify({ id: viewerId, group: viewerGroup })
      },
      nodeFQCTTL: CACHE_TTL.PUBLIC_QUERY,
    }),
  ],
  introspection: true,
  csrfPrevention: true,
  logger,
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
  app.use(
    API_ENDPOINT,
    cors<cors.CorsRequest>(CORS_OPTIONS),
    bodyParser.json(),
    expressMiddleware<Context>(server, { context: makeContext })
  )

  // Playground
  app.get(
    PLAYGROUND_ENDPOINT,
    expressPlayground({
      endpoint: API_ENDPOINT,
      // @ts-ignore
      settings: {
        'schema.polling.enable': false,
      },
    })
  )

  return server
}
