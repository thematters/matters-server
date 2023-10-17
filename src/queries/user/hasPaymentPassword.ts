import type { GQLUserStatusResolvers } from 'definitions'

const resolver: GQLUserStatusResolvers['hasPaymentPassword'] = async (
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
