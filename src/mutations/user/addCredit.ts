import type { Customer, GQLMutationResolvers } from 'definitions'

import {
  PAYMENT_CURRENCY,
  PAYMENT_MAX_DECIMAL_PLACES,
  PAYMENT_MINIMAL_ADD_CREDIT_AMOUNT,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
} from 'common/enums'
import {
  AuthenticationError,
  PaymentAmountInvalidError,
  PaymentAmountTooSmallError,
  ServerError,
} from 'common/errors'

const resolver: GQLMutationResolvers['addCredit'] = async (
  _,
  { input: { amount } },
  { viewer, dataSources: { atomService, paymentService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const provider = PAYMENT_PROVIDER.stripe
  const currency = PAYMENT_CURRENCY.HKD
  const minAmount = PAYMENT_MINIMAL_ADD_CREDIT_AMOUNT.HKD

  // check amount
  if (amount < minAmount) {
    throw new PaymentAmountTooSmallError(`The minimal amount is ${minAmount}`)
  }

  const places = amount % 1 ? amount.toString().split('.')[1].length : 0
  if (places > PAYMENT_MAX_DECIMAL_PLACES) {
    throw new PaymentAmountInvalidError(
      `maximum ${PAYMENT_MAX_DECIMAL_PLACES} decimal places`
    )
  }

  // retrieve or create customer
  let customer = (await atomService.findFirst({
    table: 'customer',
    where: {
      userId: viewer.id,
      provider,
      archived: false,
    },
  })) as Customer

  if (!customer) {
    customer = (await paymentService.createCustomer({
      user: viewer,
      provider,
    })) as Customer
  }

  // create a payment
  const payment = await paymentService.createPayment({
    userId: viewer.id,
    customerId: customer.customerId,
    amount,
    purpose: TRANSACTION_PURPOSE.addCredit,
    currency,
    provider,
  })

  if (!payment) {
    throw new ServerError('failed to create payment')
  }

  return {
    client_secret: payment.client_secret as string,
    transaction: payment.transaction,
  }
}

export default resolver
