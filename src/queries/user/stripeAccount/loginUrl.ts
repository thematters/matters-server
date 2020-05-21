import { StripeAccountToLoginUrlResolver } from 'definitions'

const resolver: StripeAccountToLoginUrlResolver = async (
  { id },
  _,
  { dataSources: { paymentService } }
) => {
  return paymentService.stripe.createExpressLoginLink(id)
}

export default resolver
