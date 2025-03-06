import type { GQLStripeAccountResolvers } from 'definitions/index.js'

import loginUrl from './loginUrl.js'

const StripeAccount: GQLStripeAccountResolvers = {
  id: ({ accountId }) => accountId,
  loginUrl,
}

export default StripeAccount
