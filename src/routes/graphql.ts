import type { Context } from 'definitions'
import type { Redis } from 'ioredis'

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
import { Express, RequestHandler, Request, Response } from 'express'
import { applyMiddleware } from 'graphql-middleware'
import expressPlayground from 'graphql-playground-middleware-express'
import { directiveEstimator, simpleEstimator } from 'graphql-query-complexity'
import { graphqlUploadExpress } from 'graphql-upload'
import Keyv from 'keyv'
import { omit } from 'lodash'
import 'module-alias/register'

import {
  CACHE_TTL,
  CORS_OPTIONS,
  GRAPHQL_COST_LIMIT,
  UPLOAD_FILE_COUNT_LIMIT,
  UPLOAD_FILE_SIZE_LIMIT,
} from 'common/enums'
import { isProd, isLocal, isTest } from 'common/environment'
import { getLogger } from 'common/logger'
import { getViewerFromReq } from 'common/utils'
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
  RecommendationService,
  TagService,
  UserService,
  UserWorkService,
  CollectionService,
  MomentService,
  CampaignService,
  TranslationService,
  LikeCoin,
  ExchangeRate,
} from 'connectors'
import {
  PublicationQueue,
  RevisionQueue,
  AssetQueue,
  MigrationQueue,
  PayToByBlockchainQueue,
  PayToByMattersQueue,
  PayoutQueue,
  UserQueue,
} from 'connectors/queue'
import { loggerMiddleware } from 'middlewares/logger'

import schema from '../schema'

import { connections } from './connections'

const logger = getLogger('graphql-server')

const API_ENDPOINT = '/graphql'
const PLAYGROUND_ENDPOINT = '/playground'

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

const cacheBackend = new ErrorsAreMissesCache(
  new KeyvAdapter(new Keyv({ store: new KeyvRedis(connections.redis) }))
) as KeyValueCache<string>

const publicationQueue = new PublicationQueue(connections)
const revisionQueue = new RevisionQueue(connections)
const assetQueue = new AssetQueue(connections)
const migrationQueue = new MigrationQueue(connections)
const payToByBlockchainQueue = new PayToByBlockchainQueue(connections)
const payToByMattersQueue = new PayToByMattersQueue(connections)
const payoutQueue = new PayoutQueue(connections)
const userQueue = new UserQueue(connections)

const queues = {
  publicationQueue,
  revisionQueue,
  assetQueue,
  migrationQueue,
  payToByBlockchainQueue,
  payToByMattersQueue,
  payoutQueue,
  userQueue,
}

export const graphql = async (app: Express) => {
  const makeContext = async ({
    req,
    res,
    connection,
  }: {
    req: Request
    res: Response
    connection?: any
  }): Promise<Context> => {
    if (connection) {
      return connection.context
    }

    const viewer = await getViewerFromReq({ req, res }, connections)

    const dataSources = {
      atomService: new AtomService(connections),
      userService: new UserService(connections),
      userWorkService: new UserWorkService(connections),
      articleService: new ArticleService(connections),
      momentService: new MomentService(connections),
      commentService: new CommentService(connections),
      draftService: new DraftService(connections),
      systemService: new SystemService(connections),
      tagService: new TagService(connections),
      oauthService: new OAuthService(connections),
      paymentService: new PaymentService(connections),
      collectionService: new CollectionService(connections),
      recommendationService: new RecommendationService(connections),
      campaignService: new CampaignService(connections),
      openseaService: new OpenSeaService(),
      likecoin: new LikeCoin(connections),
      exchangeRate: new ExchangeRate(connections.redis),
      translationService: new TranslationService(connections),
      notificationService: new NotificationService(connections),
      connections,
      queues,
    }

    // record user visiting timestamp
    if (viewer.id) {
      dataSources.userService.updateLastSeen(viewer.id)
    }

    return {
      viewer,
      req,
      res,
      dataSources,
    }
  }
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
                  ...omit(variables, exceptVariableNames),
                  ...(variables.input
                    ? { input: omit(variables.input, exceptVariableNames) }
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
        redis: connections.redis as Redis,
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
      settings: {
        'schema.polling.enable': false,
      },
    })
  )

  return server
}
