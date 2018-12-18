import article from './article'
import comment from './comment'
import draft from './draft'
import scalars from './scalars'
import system from './system'
import user from './user'
import notice from './notice'

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

export default [Root, article, comment, draft, scalars, system, user, notice]
