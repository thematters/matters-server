import { WalletToCustomerPortalResolver } from 'definitions'

const resolver: WalletToCustomerPortalResolver = async (
  { id },
  _,
  { dataSources: { paymentService } }
) => {
  return paymentService.getCustomerPortal({ userId: id })
}

export default resolver
