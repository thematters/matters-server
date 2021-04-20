import { PAYMENT_CURRENCY, PAYMENT_MINIMAL_PAYOUT_AMOUNT } from 'common/enums'
import {
  AuthenticationError,
  PaymentBalanceInsufficientError,
  PaymentPayoutAccountExistsError,
} from 'common/errors'
import { MutationToConnectStripeAccountResolver } from 'definitions'

const resolver: MutationToConnectStripeAccountResolver = async (
  _,
  { input: { country } },
  { viewer, dataSources: { atomService, paymentService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // check if payout account already exists
  const payoutAccount = await atomService.findFirst({
    table: 'payout_account',
    where: { userId: viewer.id, archived: false },
  })
  if (payoutAccount) {
    throw new PaymentPayoutAccountExistsError('payout account already exists.')
  }

  // check amount
  const balanceHKD = await paymentService.calculateBalance({
    userId: viewer.id,
    currency: PAYMENT_CURRENCY.HKD,
  })
  if (balanceHKD < PAYMENT_MINIMAL_PAYOUT_AMOUNT.HKD) {
    throw new PaymentBalanceInsufficientError(
      `require minimum ${PAYMENT_MINIMAL_PAYOUT_AMOUNT.HKD} HKD to connect stripe account.`
    )
  }

  // create acccount and return onboarding url
  const onboardingUrl = await paymentService.stripe.createExpressAccount({
    country,
    user: viewer,
  })

  return {
    redirectUrl: onboardingUrl,
  }
}

export default resolver
