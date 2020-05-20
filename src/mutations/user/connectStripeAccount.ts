import { USER_STATE } from 'common/enums'
import {
  AuthenticationError,
  PaymentPayoutAccountExistsError,
} from 'common/errors'
import { MutationToConnectStripeAccountResolver } from 'definitions'

const resolver: MutationToConnectStripeAccountResolver = async (
  _,
  __,
  { viewer, dataSources: { paymentService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // check if payout account already exists
  const payoutAccount = (
    await paymentService.findPayoutAccount({ userId: viewer.id })
  )[0]

  if (payoutAccount) {
    throw new PaymentPayoutAccountExistsError('payout account already exists.')
  }

  // create and return redirectUrl
  const redirectUrl = paymentService.stripe.createOAuthLink({
    user: viewer,
  })

  return {
    redirectUrl,
  }
}

export default resolver
