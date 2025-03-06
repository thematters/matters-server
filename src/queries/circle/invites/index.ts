import { GQLInvitesResolvers } from 'definitions/index.js'

import accepted from './accepted.js'
import pending from './pending.js'

const Invites: GQLInvitesResolvers = {
  accepted,
  pending,
}

export default Invites
