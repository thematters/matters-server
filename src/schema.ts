import { makeExecutableSchema } from 'graphql-tools'

import { types as ArticleTypes, resolvers as ArticleResolvers } from './Article'
import { types as CommentTypes, resolvers as CommentResolvers } from './Comment'
import { types as UserTypes, resolvers as UserResolvers } from './User'
import * as scalars from './scalars'

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
  typeDefs: [Root, scalars.typeDefs, ArticleTypes, CommentTypes, UserTypes],
  resolvers: {
    ...scalars.resolvers,
    ...ArticleResolvers,
    ...CommentResolvers,
    ...UserResolvers
  }
})

export default schema
