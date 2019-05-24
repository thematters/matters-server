import article from './article'
import comment from './comment'
import draft from './draft'
import notice from './notice'
import scalars from './scalars'
import system from './system'
import user from './user'
import response from './response'

const Root = /* GraphQL */ `
  type Query
  type Mutation
  type Subscription
  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`

export default [
  Root,
  article,
  comment,
  draft,
  notice,
  scalars,
  system,
  user,
  response
]
