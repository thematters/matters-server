import { GQLFollowingTypeResolver } from 'definitions'

import circles from './circles'
import tags from './tags'
import users from './users'

const Following: GQLFollowingTypeResolver = {
  circles,
  tags,
  users,
}

export default Following
