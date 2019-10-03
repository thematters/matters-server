import { merge } from 'lodash'

import article from './article'
import comment from './comment'
import draft from './draft'
import notice from './notice'
import oauthClient from './oauthClient'
import response from './response'
import scalars from './scalars'
import system from './system'
import user from './user'

export default merge(
  scalars,
  article,
  comment,
  user,
  draft,
  notice,
  system,
  response,
  oauthClient
)
