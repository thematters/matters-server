import { GQLInvitesTypeResolver } from 'definitions'

import accepted from './accepted.js'
import pending from './pending.js'

const Invites: GQLInvitesTypeResolver = {
  accepted,
  pending,
}

export default Invites
