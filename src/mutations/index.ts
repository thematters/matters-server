import { merge } from 'lodash'

import article from './article'
import campaign from './campaign'
import circle from './circle'
import collection from './collection'
import comment from './comment'
import draft from './draft'
import moment from './moment'
import notice from './notice'
import oauthClient from './oauthClient'
import system from './system'
import user from './user'

export default merge(
  article,
  campaign,
  circle,
  comment,
  draft,
  system,
  user,
  notice,
  oauthClient,
  collection,
  moment
)
