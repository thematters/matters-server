import { GQLWalletTypeResolver } from 'definitions'

import balance from './balance'
import customerPortal from './customerPortal'
import stripeAccount from './stripeAccount'
import transactions from './transactions'

const Wallet: GQLWalletTypeResolver = {
  balance,
  transactions,
  stripeAccount,
  customerPortal,
}

export default Wallet
