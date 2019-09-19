import { makeExecutableSchema } from 'graphql-tools'
import { merge } from 'lodash'

import { ForbiddenError, AuthenticationError } from 'common/errors'
import typeDefs from './types'
import queries from './queries'
import mutations from './mutations'
import subscriptions from './subscriptions'
import {
  DeprecatedDirective,
  PrivateDirective,
  authDirectiveFactory,
  UncacheViewerDirective,
  ScopeDirective,
  RecordCacheDirective,
  PurgeCacheDirective,
} from './types/directives'

const schema = makeExecutableSchema({
  typeDefs,
  schemaDirectives: {
    deprecated: DeprecatedDirective,
    authenticate: authDirectiveFactory(AuthenticationError),
    authorize: authDirectiveFactory(ForbiddenError),
    private: PrivateDirective,
    uncacheViewer: UncacheViewerDirective,
    scope: ScopeDirective,
    recordCache: RecordCacheDirective,
    purgeCache: PurgeCacheDirective
  },
  resolvers: merge(queries, mutations, subscriptions)
})

export default schema
