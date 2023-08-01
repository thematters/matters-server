import { type GQLFollowingResolvers } from 'definitions'

import circles from './circles'
import tags from './tags'
import users from './users'

const Following: GQLFollowingResolvers = {
  circles,
  tags,
  users,
}

export default Following
