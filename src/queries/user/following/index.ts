import { type GQLFollowingResolvers } from '#definitions/index.js'

import circles from './circles.js'
import users from './users.js'

const Following: GQLFollowingResolvers = {
  circles,
  users,
}

export default Following
