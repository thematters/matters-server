import article from './articleTypes'
import comment from './commentTypes'
import draft from './draftTypes'
import scalars from './scalarsTypes'
import system from './systemTypes'
import user from './userTypes'
import notice from './noticeTyeps'

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
