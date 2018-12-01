import { makeExecutableSchema } from 'graphql-tools'
import { merge } from 'lodash'

import {
  types as scalarTypes,
  resolvers as scalarResolvers
} from './types/scalars'
import ArticleTypes from './types/Article'
import CommentTypes from './types/Comment'
import DraftTypes from './types/Draft'
// import SystemTypes from './types/System'
import UserTypes from './types/User'

import ArticleQueries from './queries/article'
import CommentQueries from './queries/comment'
// import DraftQueries from './queries/draft'
// import SystemQueries from './queries/system'
import UserQueries from './queries/user'

import ArticleMutations from './mutations/article'
import CommentMutations from './mutations/comment'
// import DraftMutations from './mutations/draft'
// import SystemMutations from './mutations/system'
import UserMutations from './mutations/user'

const Root = /* GraphQL */ `
  # The dummy queries and mutations are necessary because
  # graphql-js cannot have empty root types and we only extend
  # these types later on
  # Ref: apollographql/graphql-tools#293
  type Query {
    _: Boolean
  }
  type Mutation {
    _: Boolean
  }
  type Subscription {
    _: Boolean
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
  typeDefs: [
    Root,
    scalarTypes,
    ArticleTypes,
    CommentTypes,
    UserTypes,
    DraftTypes
    // SystemTypes
  ],
  resolvers: merge(
    scalarResolvers,
    // queries
    ArticleQueries,
    CommentQueries,
    // DraftQueries,
    // SystemQueries,
    UserQueries,
    // mutations
    ArticleMutations,
    CommentMutations,
    // DraftMutations,
    // SystemMutations,
    UserMutations
  )
})

export default schema
