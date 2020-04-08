import { AuthenticationError, ServerError } from 'common/errors'
import { Customer, MutationToAddCreditResolver } from 'definitions'

const resolver: MutationToAddCreditResolver = async (
  parent,
  { input: { amount } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // TODO: set provider based on currency
  const provider = 'stripe'
  const currency = 'HKD'

  // retrieve or create customer
  let customer = (
    await userService.findCustomer({
      userId: viewer.id,
      provider,
    })
  )[0] as Customer

  if (!customer) {
    customer = (await userService.createCustomer({
      user: viewer,
      provider,
    })) as Customer
  }

  // create a payment
  const payment = await userService.createPayment({
    userId: viewer.id,
    customerId: customer.customerId,
    amount,
    purpose: 'add-credit',
    currency,
    provider,
  })

  if (!payment) {
    throw new ServerError('failed to create payment')
  }

  console.log({ payment })

  return {
    client_secret: payment.client_secret,
    transaction: payment.transaction,
  }
}

export default resolver
