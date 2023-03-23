import { GQLStripeAccountTypeResolver } from 'definitions'

import loginUrl from './loginUrl.js'

const StripeAccount: GQLStripeAccountTypeResolver = {
  id: ({ accountId }) => accountId,
  loginUrl,
}

export default StripeAccount
