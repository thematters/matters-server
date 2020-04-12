import { makeExecutableSchema } from 'graphql-tools'
import { merge } from 'lodash'

import { AuthenticationError, ForbiddenError } from 'common/errors'

import mutations from './mutations'
import queries from './queries'
import subscriptions from './subscriptions'
import typeDefs from './types'
import {
  authDirectiveFactory,
  DeprecatedDirective,
  LogCacheDirective,
  ObjectCacheDirective,
  PrivateCacheDirective,
  PurgeCacheDirective,
  RateLimitDirective,
  ScopeDirective,
} from './types/directives'

const schema = makeExecutableSchema({
  typeDefs,
  schemaDirectives: {
    deprecated: DeprecatedDirective,
    authenticate: authDirectiveFactory(AuthenticationError),
    authorize: authDirectiveFactory(ForbiddenError),
    scope: ScopeDirective,
    purgeCache: PurgeCacheDirective,
    privateCache: PrivateCacheDirective,
    logCache: LogCacheDirective,
    rateLimit: RateLimitDirective,
    objectCache: ObjectCacheDirective,
  },
  resolvers: merge(queries, mutations, subscriptions),
})

export default schema
