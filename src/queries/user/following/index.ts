import { GQLFollowingTypeResolver } from 'definitions'

import circles from './circles.js'
import tags from './tags.js'
import users from './users.js'

const Following: GQLFollowingTypeResolver = {
  circles,
  tags,
  users,
}

export default Following
