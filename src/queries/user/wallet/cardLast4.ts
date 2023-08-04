import type { Customer, GQLWalletResolvers } from 'definitions'

import { PAYMENT_PROVIDER } from 'common/enums'

const resolver: GQLWalletResolvers['cardLast4'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const customer = (await atomService.findFirst({
    table: 'customer',
    where: { userId: id, provider: PAYMENT_PROVIDER.stripe, archived: false },
  })) as Customer

  if (!customer || !customer.cardLast4) {
    return null
  }

  return customer.cardLast4
}

export default resolver
