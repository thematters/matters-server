import { GQLWalletTypeResolver } from 'definitions'

import balance from './balance'
import stripeAccount from './stripeAccount'
import transactions from './transactions'

const Wallet: GQLWalletTypeResolver = {
  balance,
  transactions,
  stripeAccount,
}

export default Wallet
