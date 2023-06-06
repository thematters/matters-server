import { StripeAccountToLoginUrlResolver } from 'definitions'

const resolver: StripeAccountToLoginUrlResolver = async (
  { accountId },
  _,
  { dataSources: { paymentService } }
) => paymentService.stripe.createExpressLoginLink(accountId)

export default resolver
