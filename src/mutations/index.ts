import merge from 'lodash/merge.js'

import article from './article/index.js'
import circle from './circle/index.js'
import comment from './comment/index.js'
import draft from './draft/index.js'
import notice from './notice/index.js'
import oauthClient from './oauthClient/index.js'
import system from './system/index.js'
import user from './user/index.js'

export default merge(
  article,
  circle,
  comment,
  draft,
  system,
  user,
  notice,
  oauthClient
)
