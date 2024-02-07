import type { Customer, Connections } from 'definitions'

import _ from 'lodash'
import Stripe from 'stripe'

import { PAYMENT_PROVIDER } from 'common/enums'
import { AtomService, PaymentService } from 'connectors'
import SlackService from 'connectors/slack'

export const updateCustomerCard = async (
  {
    setupIntent,
    event,
  }: {
    setupIntent: Stripe.SetupIntent
    event: Stripe.Event
  },
  connections: Connections
) => {
  const atomService = new AtomService(connections)
  const paymentService = new PaymentService(connections)
  const slack = new SlackService()
  const slackEventData = {
    id: event.id,
    type: event.type,
  }

  const customerId = setupIntent.customer as string
  const paymentMethodId = setupIntent.payment_method as string

  if (!customerId || !paymentMethodId) {
    slack.sendStripeAlert({
      data: slackEventData,
      message: `customer (${customerId}) or paymentMethod (${paymentMethodId}) doesn't exist.`,
    })
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
    slack.sendStripeAlert({
      data: slackEventData,
      message: `can't find customer ${customerId}.`,
    })
    return
  }

  // retrieve payment method and update to DB customer
  const paymentMethod = await paymentService.stripe.getPaymentMethod(
    paymentMethodId
  )
  const cardLast4 = _.get(paymentMethod, 'card.last4')

  if (!cardLast4) {
    slack.sendStripeAlert({
      data: slackEventData,
      message: `cardLast4 doesn't exist.`,
    })
    return
  }

  const updatedCustomer = await atomService.update({
    table: 'customer',
    where: { id: customer.id },
    data: {
      cardLast4,
    },
  })

  // set as default payment method
  await paymentService.stripe.updateCustomer({
    id: customerId,
    paymentMethod: paymentMethodId,
  })

  return updatedCustomer
}
