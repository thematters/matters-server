import { PAYMENT_CURRENCY } from 'common/enums'
import { WalletToBalanceResolver } from 'definitions'

const resolver: WalletToBalanceResolver = async (
  { id },
  _,
  { dataSources: { paymentService } }
) => {
  const HKD = await paymentService.countBalance({
    userId: id,
    currency: PAYMENT_CURRENCY.HKD,
  })

  return {
    HKD,
  }
}

export default resolver
