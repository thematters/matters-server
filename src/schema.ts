import { makeExecutableSchema } from 'graphql-tools'
import { merge } from 'lodash'

import typeDefs from './types'
import queries from './queries'
import mutations from './mutations'
import subscriptions from './subscriptions'

const schema = makeExecutableSchema({
  typeDefs,
  resolvers: merge(queries, mutations, subscriptions)
})

export default schema
