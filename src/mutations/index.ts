import { merge } from 'lodash'

import article from './article'
import comment from './comment'
import draft from './draft'
import file from './file'
import system from './system'
import user from './user'
import notice from './notice'

export default merge(article, comment, draft, file, system, user, notice)
