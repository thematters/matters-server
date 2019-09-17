import { merge } from 'lodash'

import article from './article'
import comment from './comment'
import draft from './draft'
import system from './system'
import user from './user'
import notice from './notice'
import oauthClient from './oauthClient'

export default merge(article, comment, draft, system, user, notice, oauthClient)
