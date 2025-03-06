import type { GQLStripeAccountResolvers } from 'definitions/index.js'

const resolver: GQLStripeAccountResolvers['loginUrl'] = async (
  { accountId },
  _,
  { dataSources: { paymentService } }
) => paymentService.stripe.createExpressLoginLink(accountId)

export default resolver
