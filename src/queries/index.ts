import merge from 'lodash/merge.js'

import article from './article/index.js'
import circle from './circle/index.js'
import comment from './comment/index.js'
import draft from './draft/index.js'
import exchangeRates from './exchangeRates.js'
import notice from './notice/index.js'
import oauthClient from './oauthClient/index.js'
import response from './response/index.js'
import scalars from './scalars.js'
import system from './system/index.js'
import user from './user/index.js'

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
  exchangeRates
)
