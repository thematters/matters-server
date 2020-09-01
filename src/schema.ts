import {
  LogCacheDirective,
  PurgeCacheDirective,
} from '@matters/apollo-response-cache'
import { makeExecutableSchema } from 'graphql-tools'
import { merge } from 'lodash'

import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'

import mutations from './mutations'
import queries from './queries'
import subscriptions from './subscriptions'
import typeDefs from './types'
import {
  DeprecatedDirective,
  ObjectCacheDirective,
  PrivateCacheDirective,
  RateLimitDirective,
  ScopeDirective,
} from './types/directives'

const typeResolver = (type: string, result: any) => {
  const unionsAndInterfaces = [
    NODE_TYPES.node,
    NODE_TYPES.response,
    NODE_TYPES.transactionTarget,
    NODE_TYPES.notice,
  ]

  if (unionsAndInterfaces.indexOf(type) >= 0 && result?.__type) {
    return result.__type
  }

  return type
}

const schema = makeExecutableSchema({
  typeDefs,
  schemaDirectives: {
    deprecated: DeprecatedDirective,

    // limitation
    scope: ScopeDirective,
    rateLimit: RateLimitDirective,

    // caching
    privateCache: PrivateCacheDirective,
    objectCache: ObjectCacheDirective,
    logCache: LogCacheDirective({ typeResolver }),
    purgeCache: PurgeCacheDirective({
      typeResolver,
      extraNodesPath: CACHE_KEYWORD,
    }),
  },
  resolvers: merge(queries, mutations, subscriptions),
})

export default schema
