import { GQLWalletTypeResolver } from 'definitions'

import balance from './balance'
import cardLast4 from './cardLast4'
import customerPortal from './customerPortal'
import stripeAccount from './stripeAccount'
import transactions from './transactions'

const Wallet: GQLWalletTypeResolver = {
  balance,
  transactions,
  stripeAccount,
  customerPortal,
  cardLast4,
}

export default Wallet
