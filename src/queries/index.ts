import { merge } from 'lodash'

import article from './article/index.js'
import campaign from './campaign/index.js'
import channel from './channel/index.js'
import circle from './circle/index.js'
import comment from './comment/index.js'
import draft from './draft/index.js'
import exchangeRates from './exchangeRates.js'
import moment from './moment/index.js'
import notice from './notice/index.js'
import oauthClient from './oauthClient/index.js'
import oauthRequestToken from './oauthRequestToken.js'
import recommendation from './recommendation.js'
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
  oauthRequestToken,
  exchangeRates,
  recommendation,
  moment,
  campaign,
  channel
)
