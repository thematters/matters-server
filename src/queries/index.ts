import { merge } from 'lodash'

import article from './article'
import circle from './circle'
import comment from './comment'
import draft from './draft'
import exchangeRates from './exchangeRates'
import notice from './notice'
import oauthClient from './oauthClient'
import oauthRequestToken from './oauthRequestToken'
import recommendation from './recommendation'
import response from './response'
import scalars from './scalars'
import system from './system'
import user from './user'

export default merge(
  scalars,
  article,
  circle,
  comment,
  user,
  draft,
  notice,
  system,
  response,
  oauthClient,
  oauthRequestToken,
  exchangeRates,
  recommendation
)
