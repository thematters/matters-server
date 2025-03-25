import article from './article.js'
import campaign from './campaign.js'
import channel from './channel.js'
import circle from './circle.js'
import collection from './collection.js'
import comment from './comment.js'
import draft from './draft.js'
import moment from './moment.js'
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
  channel,
]
