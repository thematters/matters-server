import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
} from 'common/enums'
import {
  AuthenticationError,
  PaymentAmountInvalidError,
  PaymentAmountTooSmallError,
  ServerError,
} from 'common/errors'
import { Customer, MutationToAddCreditResolver } from 'definitions'

const MIN_AMOUNT = 20

const MAX_DECIMAL_PLACES = 2

const resolver: MutationToAddCreditResolver = async (
  parent,
  { input: { amount } },
  { viewer, dataSources: { atomService, paymentService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // check amount
  if (amount < MIN_AMOUNT) {
    throw new PaymentAmountTooSmallError('The minimal amount is 20')
  }

  // check deciaml places
  const places = amount % 1 ? amount.toString().split('.')[1].length : 0
  if (places > MAX_DECIMAL_PLACES) {
    throw new PaymentAmountInvalidError('maximum 2 decimal places')
  }

  const provider = PAYMENT_PROVIDER.stripe
  const currency = PAYMENT_CURRENCY.HKD

  // retrieve or create customer
  let customer = (await atomService.findFirst({
    table: 'customer',
    where: {
      userId: viewer.id,
      provider,
      archvied: false,
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
    client_secret: payment.client_secret,
    transaction: payment.transaction,
  }
}

export default resolver
