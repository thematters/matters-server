import article from './article.js'
import circle from './circle.js'
import comment from './comment.js'
import draft from './draft.js'
import notice from './notice.js'
import oauthClient from './oauthClient.js'
import payment from './payment.js'
import response from './response.js'
import scalars from './scalars.js'
import system from './system.js'
import user from './user.js'

const Root = /* GraphQL */ `
  type Query
  type Mutation

  schema {
    query: Query
    mutation: Mutation
  }
`

export default [
  Root,
  article,
  circle,
  comment,
  draft,
  notice,
  scalars,
  system,
  user,
  response,
  payment,
  oauthClient,
]
