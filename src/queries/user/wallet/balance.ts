import { environment } from 'common/environment'
import { WalletToBalanceResolver } from 'definitions'

const resolver: WalletToBalanceResolver = async (
  root,
  _,
  { viewer, dataSources: { userService } }
) => {
  return null
}

export default resolver
