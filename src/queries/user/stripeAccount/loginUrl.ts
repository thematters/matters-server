import { StripeAccountToLoginUrlResolver } from 'definitions'

const resolver: StripeAccountToLoginUrlResolver = async (
  { accountId },
  _,
  { dataSources: { paymentService } }
) => {
  return paymentService.stripe.createExpressLoginLink(accountId)
}

export default resolver
