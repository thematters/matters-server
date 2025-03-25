import type { GQLWalletResolvers } from '#definitions/index.js'

import { PAYMENT_CURRENCY } from '#common/enums/index.js'

const resolver: GQLWalletResolvers['balance'] = async (
  { id },
  _,
  { dataSources: { paymentService } }
) => {
  if (id === null) {
    return {
      HKD: 0,
    }
  }

  const HKD = await paymentService.calculateBalance({
    userId: id,
    currency: PAYMENT_CURRENCY.HKD,
  })

  return {
    HKD,
  }
}

export default resolver
