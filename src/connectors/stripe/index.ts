import Stripe from 'stripe'

import { TRANSACTION_CURRENCY } from 'common/enums'
import { environment } from 'common/environment'
import { User } from 'definitions'

class StripeService {
  stripe: Stripe

  constructor() {
    this.stripe = new Stripe(environment.stripeSecret, {
      apiVersion: '2020-03-02',
    })
  }

  createCustomer({ user }: { user: User }) {
    return this.stripe.customers.create({
      email: user.email,
      metadata: {
        user_id: user.id,
      },
    })
  }

  createPaymentIntent({
    customerId,
    amount,
    currency,
  }: {
    customerId: string
    amount: number
    currency: keyof typeof TRANSACTION_CURRENCY
  }) {
    return this.stripe.paymentIntents.create({
      customer: customerId,
      amount,
      currency,
    })
  }
}

export const stripe = new StripeService()
