import { environment } from 'common/environment'
import { WalletToTransactionsResolver } from 'definitions'

const resolver: WalletToTransactionsResolver = async (
  root,
  { input: { first, after, uuid } },
  { viewer, dataSources: { userService } }
) => {
  return null
}

export default resolver
