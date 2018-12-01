import { merge } from 'lodash'

import article from './article'
import comment from './comment'
import draft from './draft'
import system from './system'
import user from './user'

export default merge(system, article, comment, user, draft)
