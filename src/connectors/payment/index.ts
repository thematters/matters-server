import Stripe from 'stripe'

import { environment } from 'common/environment'
import logger from 'common/logger'

class Payment {
  stripe: Stripe

  constructor() {
    this.stripe = new Stripe(environment.stripeSecret, {
      apiVersion: '2020-03-02',
    })
  }
}

export const payment = new Payment()
