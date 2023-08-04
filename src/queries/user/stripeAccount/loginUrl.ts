import type { GQLStripeAccountResolvers } from 'definitions'

const resolver: GQLStripeAccountResolvers['loginUrl'] = async (
  { accountId },
  _,
  { dataSources: { paymentService } }
) => paymentService.stripe.createExpressLoginLink(accountId)

export default resolver
