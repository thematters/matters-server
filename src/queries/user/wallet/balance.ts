import { PAYMENT_CURRENCY } from 'common/enums/index.js'
import { WalletToBalanceResolver } from 'definitions'

const resolver: WalletToBalanceResolver = async (
  { id },
  _,
  { dataSources: { paymentService } }
) => {
  const HKD = await paymentService.calculateBalance({
    userId: id,
    currency: PAYMENT_CURRENCY.HKD,
  })

  return {
    HKD,
  }
}

export default resolver
