import { makeExecutableSchema } from 'graphql-tools'
import { merge } from 'lodash'

import typeDefs from './types'
import { DeprecatedDirective } from './types/directives'
import queries from './queries'
import mutations from './mutations'
import subscriptions from './subscriptions'

const schema = makeExecutableSchema({
  typeDefs,
  schemaDirectives: {
    deprecated: DeprecatedDirective
  },
  resolvers: merge(queries, mutations, subscriptions)
})

export default schema
