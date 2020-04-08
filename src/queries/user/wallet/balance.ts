import { WalletToBalanceResolver } from 'definitions'

const resolver: WalletToBalanceResolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => {
  const HKD = await userService.countBalance({
    userId: id,
    currency: 'HKD',
  })

  return {
    HKD,
  }
}

export default resolver
