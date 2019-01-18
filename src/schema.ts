import { makeExecutableSchema } from 'graphql-tools'
import { merge } from 'lodash'

import typeDefs from './types'
import { DeprecatedDirective, authDirectiveFactory } from './types/directives'
import queries from './queries'
import mutations from './mutations'
import subscriptions from './subscriptions'

const schema = makeExecutableSchema({
  typeDefs,
  schemaDirectives: {
    deprecated: DeprecatedDirective,
    authenticate: authDirectiveFactory('UNAUTHENTICATED'),
    authorize: authDirectiveFactory('FORBIDDEN')
  },
  resolvers: merge(queries, mutations, subscriptions)
})

export default schema
