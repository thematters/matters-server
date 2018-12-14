import article from './article'
import comment from './comment'
import draft from './draft'
import file from './file'
import notice from './notice'
import scalars from './scalars'
import system from './system'
import user from './user'

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

export default [Root, article, comment, draft, file, notice, scalars, system, user]
