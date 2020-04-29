import { UserStatusToHasPaymentPasswordResolver } from 'definitions'

const resolver: UserStatusToHasPaymentPasswordResolver = async (
  { id, paymentPasswordHash },
  _,
  { viewer }
) => {
  if (paymentPasswordHash) {
    return true
  }

  return false
}

export default resolver
