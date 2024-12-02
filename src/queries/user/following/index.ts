import { type GQLFollowingResolvers } from 'definitions'

import circles from './circles'
import users from './users'

const Following: GQLFollowingResolvers = {
  circles,
  users,
}

export default Following
