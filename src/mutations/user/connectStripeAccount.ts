import { invalidateFQC } from '@matters/apollo-response-cache'

import {
  NODE_TYPES,
  PAYMENT_CURRENCY,
  PAYMENT_MINIMAL_PAYOUT_AMOUNT,
  PAYMENT_PROVIDER,
  PAYMENT_STRIPE_PAYOUT_ACCOUNT_TYPE,
} from 'common/enums'
import {
  AuthenticationError,
  PaymentBalanceInsufficientError,
  PaymentPayoutAccountExistsError,
  ServerError,
} from 'common/errors'
import { redis } from 'connectors'
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
    where: { userId: viewer.id, capabilitiesTransfers: true, archived: false },
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
  const account = await paymentService.stripe.createExpressAccount({
    country,
    user: viewer,
  })

  if (!account) {
    throw new ServerError('failed to create stripe account')
  }

  // save to db
  await atomService.create({
    table: 'payout_account',
    data: {
      userId: viewer.id,
      accountId: account.accountId,
      country: account.country,
      currency: account.currency,
      capabilitiesTransfers: false,
      type: PAYMENT_STRIPE_PAYOUT_ACCOUNT_TYPE.express,
      provider: PAYMENT_PROVIDER.stripe,
    },
  })

  // invalidate user cache
  await invalidateFQC({
    node: { type: NODE_TYPES.User, id: viewer.id },
    redis: { client: redis },
  })

  return {
    redirectUrl: account.onboardingUrl,
  }
}

export default resolver
