import type { GQLStripeAccountResolvers } from 'definitions'

import loginUrl from './loginUrl'

const StripeAccount: GQLStripeAccountResolvers = {
  id: ({ accountId }) => accountId,
  loginUrl,
}

export default StripeAccount
