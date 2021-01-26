import _ from 'lodash'
import Stripe from 'stripe'

import { PAYMENT_PROVIDER } from 'common/enums'
import { AtomService, PaymentService } from 'connectors'
import { Customer } from 'definitions'

export const updateCustomerCard = async (setupIntent: Stripe.SetupIntent) => {
  const atomService = new AtomService()
  const paymentService = new PaymentService()

  const customerId = setupIntent.customer as string
  const paymentMethodId = setupIntent.payment_method as string

  if (!customerId || !paymentMethodId) {
    return
  }

  const customer = (await atomService.findFirst({
    table: 'customer',
    where: {
      customerId,
      provider: PAYMENT_PROVIDER.stripe,
      archived: false,
    },
  })) as Customer

  if (!customer) {
    return
  }

  // retrieve payment method and update to DB customer
  const paymentMethod = await paymentService.stripe.stripeAPI.paymentMethods.retrieve(
    paymentMethodId
  )
  const cardLast4 = _.get(paymentMethod, 'card.last4')

  if (!cardLast4) {
    return
  }

  const updatedCustomer = (await atomService.update({
    table: 'customer',
    where: { id: customer.id },
    data: {
      card_last_4: cardLast4,
    },
  })) as Customer

  // set as default payment method
  await paymentService.stripe.stripeAPI.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  })

  return updatedCustomer
}
