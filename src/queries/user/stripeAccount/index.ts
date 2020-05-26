import { GQLStripeAccountTypeResolver } from 'definitions'

import loginUrl from './loginUrl'

const StripeAccount: GQLStripeAccountTypeResolver = {
  id: ({ accountId }) => accountId,
  loginUrl,
}

export default StripeAccount
