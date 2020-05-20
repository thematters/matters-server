import { GQLStripeAccountTypeResolver } from 'definitions'

import loginUrl from './loginUrl'

const StripeAccount: GQLStripeAccountTypeResolver = {
  id: ({ id }) => id,
  loginUrl,
}

export default StripeAccount
