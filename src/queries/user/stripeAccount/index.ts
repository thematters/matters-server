import type { GQLStripeAccountResolvers, GlobalId } from '#definitions/index.js'

import loginUrl from './loginUrl.js'

const StripeAccount: GQLStripeAccountResolvers = {
  id: ({ accountId }) => accountId as GlobalId,
  loginUrl,
}

export default StripeAccount
