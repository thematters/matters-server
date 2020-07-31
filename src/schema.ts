import {
  LogCacheDirective,
  PurgeCacheDirective,
} from '@matters/apollo-response-cache'
import { makeExecutableSchema } from 'graphql-tools'
import { merge } from 'lodash'

import { CACHE_KEYWORD } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'

import mutations from './mutations'
import queries from './queries'
import subscriptions from './subscriptions'
import typeDefs from './types'
import {
  authDirectiveFactory,
  DeprecatedDirective,
  ObjectCacheDirective,
  PrivateCacheDirective,
  RateLimitDirective,
  ScopeDirective,
} from './types/directives'

const typeResolver = (type: string, result: any) => {
  const unionsAndInterfaces = [
    'Node',
    'Response',
    'Connection',
    'TransactionTarget',
    'Notice',
  ]

  if (unionsAndInterfaces.indexOf(type) >= 0) {
    return result.__type
  }

  return type
}

const schema = makeExecutableSchema({
  typeDefs,
  schemaDirectives: {
    deprecated: DeprecatedDirective,
    authenticate: authDirectiveFactory(AuthenticationError),
    authorize: authDirectiveFactory(ForbiddenError),
    scope: ScopeDirective,
    rateLimit: RateLimitDirective,
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
