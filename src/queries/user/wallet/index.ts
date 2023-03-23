import { GQLWalletTypeResolver } from 'definitions'

import balance from './balance.js'
import cardLast4 from './cardLast4.js'
import customerPortal from './customerPortal.js'
import stripeAccount from './stripeAccount.js'
import transactions from './transactions.js'

const Wallet: GQLWalletTypeResolver = {
  balance,
  transactions,
  stripeAccount,
  customerPortal,
  cardLast4,
}

export default Wallet
