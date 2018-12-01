import { makeExecutableSchema } from 'graphql-tools'
import { merge } from 'lodash'

import typeDefs from './types'
import queries from './queries'
import mutations from './mutations'

const schema = makeExecutableSchema({
  typeDefs,
  resolvers: merge(queries, mutations)
})

export default schema
