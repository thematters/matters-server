import article from './article'
import campaign from './campaign'
import circle from './circle'
import collection from './collection'
import comment from './comment'
import draft from './draft'
import moment from './moment'
import notice from './notice'
import oauthClient from './oauthClient'
import payment from './payment'
import response from './response'
import scalars from './scalars'
import system from './system'
import user from './user'

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
  campaign,
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
  collection,
  moment,
]
