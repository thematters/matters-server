import { PAYMENT_PROVIDER } from 'common/enums'
import { Customer, WalletToCardLast4Resolver } from 'definitions'

const resolver: WalletToCardLast4Resolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const customer = (await atomService.findFirst({
    table: 'customer',
    where: { userId: id, provider: PAYMENT_PROVIDER.stripe, archived: false },
  })) as Customer

  if (!customer || !customer.cardLast4) {
    return
  }

  return customer.cardLast4
}

export default resolver
