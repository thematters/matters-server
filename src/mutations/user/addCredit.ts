import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
} from 'common/enums'
import {
  AuthenticationError,
  PaymentAmountTooSmallError,
  ServerError,
} from 'common/errors'
import { Customer, MutationToAddCreditResolver } from 'definitions'

const MINIMAL_AMOUNT = 20

const resolver: MutationToAddCreditResolver = async (
  parent,
  { input: { amount } },
  { viewer, dataSources: { paymentService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // check amount
  if (amount < MINIMAL_AMOUNT) {
    throw new PaymentAmountTooSmallError('The minimal amount is 20')
  }

  // TODO: check deciaml places

  const provider = PAYMENT_PROVIDER.stripe
  const currency = PAYMENT_CURRENCY.HKD

  // retrieve or create customer
  let customer = (
    await paymentService.findCustomer({
      userId: viewer.id,
      provider,
    })
  )[0] as Customer

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
    client_secret: payment.client_secret,
    transaction: payment.transaction,
  }
}

export default resolver
