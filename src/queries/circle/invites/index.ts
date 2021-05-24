import { GQLInvitesTypeResolver } from 'definitions'

import accepted from './accepted'
import pending from './pending'

const Invites: GQLInvitesTypeResolver = {
  accepted,
  pending,
}

export default Invites
