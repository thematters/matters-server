// import { responseCachePlugin } from '@matters/apollo-response-cache'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting'
import { RedisCache } from 'apollo-server-cache-redis'
import bodyParser from 'body-parser'
import cors from 'cors'
import { Express, RequestHandler } from 'express'
// import costAnalysis from 'graphql-cost-analysis'
import depthLimit from 'graphql-depth-limit'
import { applyMiddleware } from 'graphql-middleware'
import expressPlayground from 'graphql-playground-middleware-express'
import { graphqlUploadExpress } from 'graphql-upload'
import _ from 'lodash'
import 'module-alias/register'

import {
  CACHE_TTL,
  CORS_OPTIONS,
  //  GRAPHQL_COST_LIMIT,
  UPLOAD_FILE_COUNT_LIMIT,
  UPLOAD_FILE_SIZE_LIMIT,
} from 'common/enums'
import { environment, isProd } from 'common/environment'
// import { ActionLimitExceededError } from 'common/errors'
import { getLogger } from 'common/logger'
import { makeContext } from 'common/utils'
import { RequestContext } from 'definitions'
import { loggerMiddleware } from 'middlewares/logger'

import schema from '../schema'

const logger = getLogger('graphql-server')

const API_ENDPOINT = '/graphql'
const PLAYGROUND_ENDPOINT = '/playground'

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

const cache = new RedisCache({
  host: environment.cacheHost,
  port: environment.cachePort,
})

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

const server = new ApolloServer<RequestContext>({
  schema: composedSchema,
  includeStacktraceInErrorResponses: !isProd,
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
    // responseCachePlugin({
    //   sessionId: ({ context }) => {
    //     const viewerId = _.get(context, 'viewer.id', '')
    //     const viewerGroup = _.get(context, 'viewer.group', '')
    //     return JSON.stringify({ id: viewerId, group: viewerGroup })
    //   },
    //   nodeFQCTTL: CACHE_TTL.PUBLIC_QUERY,
    // }),
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
    expressMiddleware<RequestContext>(server, { context: makeContext })
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
