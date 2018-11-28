import { makeExecutableSchema } from 'graphql-tools'
import { merge } from 'lodash'

import { types as ArticleTypes, resolvers as ArticleResolvers } from './Article'
import { types as CommentTypes, resolvers as CommentResolvers } from './Comment'
import { types as UserTypes, resolvers as UserResolvers } from './User'
import { types as scalarTypes, resolvers as scalarResolvers } from './scalars'

const Root = /* GraphQL */ `
  # The dummy queries and mutations are necessary because
  # graphql-js cannot have empty root types and we only extend
  # these types later on
  # Ref: apollographql/graphql-tools#293
  type Query {
    dummy: String
  }
  type Mutation {
    dummy: String
  }
  type Subscription {
    dummy: String
  }
  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`

// Create the final GraphQL schema out of the type definitions
// and the resolvers
const schema = makeExecutableSchema({
  typeDefs: [Root, scalarTypes, ArticleTypes, CommentTypes, UserTypes],
  resolvers: merge(
    scalarResolvers,
    ArticleResolvers,
    CommentResolvers,
    UserResolvers
  )
})

export default schema
