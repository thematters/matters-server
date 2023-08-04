import { GQLInvitesResolvers } from 'definitions'

import accepted from './accepted'
import pending from './pending'

const Invites: GQLInvitesResolvers = {
  accepted,
  pending,
}

export default Invites
