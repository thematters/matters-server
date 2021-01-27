import Stripe from 'stripe'

import { LOCAL_STRIPE, METADATA_KEY, PAYMENT_CURRENCY } from 'common/enums'
import { environment, isTest } from 'common/environment'
import { PaymentAmountInvalidError, ServerError } from 'common/errors'
import logger from 'common/logger'
import { getUTC8NextMonthDayOne, toProviderAmount } from 'common/utils'
import { User } from 'definitions'

/**
 * Interact with Stripe
 *
 * API Docs:
 * @see {@url https://stripe.com/docs/api}
 *
 * Error Handling:
 * @see {@url https://stripe.com/docs/error-handling}
 * @see {@url https://stripe.com/docs/error-codes}
 * @see {@url https://stripe.com/docs/api/errors/handling}
 */
class StripeService {
  stripeAPI: Stripe

  constructor() {
    let options: Record<string, any> = {}
    if (isTest) {
      options = LOCAL_STRIPE
    }

    this.stripeAPI = new Stripe(environment.stripeSecret, {
      apiVersion: '2020-03-02',
      ...options,
    })
  }

  handleError(err: Stripe.StripeError) {
    logger.error(err)

    switch (err.code) {
      case 'parameter_invalid_integer':
        throw new PaymentAmountInvalidError('maximum 2 decimal places')
      default:
        throw new ServerError('failed to process the payment request')
    }
  }

  createCustomer = async ({ user }: { user: User }) => {
    try {
      return await this.stripeAPI.customers.create({
        email: user.email,
        metadata: {
          [METADATA_KEY.USER_ID]: user.id,
        },
      })
    } catch (err) {
      this.handleError(err)
    }
  }

  /**
   * Creates a PaymentIntent object.
   *
   * @param customerId ID of the Customer this PaymentIntent belongs to.
   * @param amount Amount intended to be collected by this PaymentIntent.
   * @param currency
   *
   */
  createPaymentIntent = async ({
    customerId,
    amount,
    currency,
  }: {
    customerId: string
    amount: number
    currency: PAYMENT_CURRENCY
  }) => {
    try {
      return await this.stripeAPI.paymentIntents.create({
        customer: customerId,
        amount: toProviderAmount({ amount }),
        currency,
      })
    } catch (err) {
      this.handleError(err)
    }
  }

  /**
   * Collect customer's credit card via SetupIntent, used by circle subscription.
   *
   * @param customerId ID of the Customer this PaymentIntent belongs to.
   * @param amount Amount intended to be collected by this PaymentIntent.
   * @param currency
   *
   */
  createSetupIntent = async ({
    customerId,
    metadata,
  }: {
    customerId: string
    metadata?: Stripe.MetadataParam
  }) => {
    try {
      return await this.stripeAPI.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata,
      })
    } catch (err) {
      this.handleError(err)
    }
  }

  /**
   * Create OAuth Link for viewer to connect Stripe account
   *
   * @see {@url https://stripe.com/docs/connect/oauth-reference}
   * @see {@url https://stripe.com/docs/connect/express-accounts#integrating-oauth}
   */
  createOAuthLink = ({ user }: { user: User }) => {
    return this.stripeAPI.oauth.authorizeUrl(
      {
        client_id: environment.stripeConnectClientId,
        response_type: 'code',
        redirect_uri: environment.stripeConnectCallbackURL,
        suggested_capabilities: ['card_payments', 'transfers'],
        stripe_user: {
          email: user.email,
          url: `${environment.siteDomain}/@${user.userName}`,
          country: 'HK',
        },
      },
      {
        express: true,
      }
    )
  }

  createExpressLoginLink = async (accountId: string) => {
    const { url } = await this.stripeAPI.accounts.createLoginLink(accountId)
    return url
  }

  /**
   * Create destination charge.
   *
   * @see {@url https://stripe.com/docs/connect/destination-charges}
   */
  createDestinationCharge = async ({
    amount,
    currency,
    fee,
    recipientStripeConnectedId,
  }: {
    amount: number
    currency: PAYMENT_CURRENCY
    fee: number
    recipientStripeConnectedId: string
  }) => {
    try {
      if (!environment.stripeCustomerId) {
        throw new ServerError('matters stripe customer id has not been set')
      }

      return await this.stripeAPI.paymentIntents.create({
        amount: toProviderAmount({ amount }),
        application_fee_amount: toProviderAmount({ amount: fee }),
        confirm: true,
        currency,
        customer: environment.stripeCustomerId,
        off_session: true,
        on_behalf_of: recipientStripeConnectedId,
        transfer_data: {
          destination: recipientStripeConnectedId,
        },
      })
    } catch (error) {
      this.handleError(error)
    }
  }

  createProduct = async ({ name, owner }: { name: string; owner: string }) => {
    try {
      const product = await this.stripeAPI.products.create({
        name,
        metadata: { [METADATA_KEY.USER_ID]: owner },
      })
      return product
    } catch (error) {
      this.handleError(error)
    }
  }

  updateProduct = async ({ id, name }: { id: string; name: string }) => {
    try {
      const product = await this.stripeAPI.products.update(id, { name })
      return product
    } catch (error) {
      this.handleError(error)
    }
  }

  deleteProduct = async ({ id }: { id: string }) => {
    try {
      await this.stripeAPI.products.del(id)
    } catch (error) {
      this.handleError(error)
    }
  }

  createPrice = async ({
    amount,
    currency,
    interval,
    productId,
  }: {
    amount: number
    currency: PAYMENT_CURRENCY
    interval: 'month'
    productId: string
  }) => {
    try {
      const price = await this.stripeAPI.prices.create({
        currency,
        product: productId,
        recurring: { interval },
        unit_amount: toProviderAmount({ amount }),
      })
      return price
    } catch (error) {
      this.handleError(error)
    }
  }

  createSubscription = async ({
    customer,
    price,
  }: {
    customer: string
    price: string
  }) => {
    try {
      const anchorTime = getUTC8NextMonthDayOne() / 1000
      const subscription = await this.stripeAPI.subscriptions.create({
        billing_cycle_anchor: anchorTime,
        customer,
        items: [{ price }],
        proration_behavior: 'none',
      })
      return subscription
    } catch (error) {
      this.handleError(error)
    }
  }

  createSubscriptionItem = async ({
    price,
    subscription,
  }: {
    price: string
    subscription: string
  }) => {
    try {
      const item = await this.stripeAPI.subscriptionItems.create({
        price,
        proration_behavior: 'none',
        quantity: 1,
        subscription,
      })
      return item
    } catch (error) {
      this.handleError(error)
    }
  }

  deleteSubscriptionItem = async ({ id }: { id: string }) => {
    try {
      await this.stripeAPI.subscriptionItems.del(id)
    } catch (error) {
      this.handleError(error)
    }
  }

  /**
   * Get customer portal URL
   */
  getCustomerPortal = async ({ customerId }: { customerId: string }) => {
    try {
      const session = await this.stripeAPI.billingPortal.sessions.create({
        customer: customerId,
      })
      return session.url
    } catch (error) {
      this.handleError(error)
    }
  }

  getDeliveryFailedEvents = async () => {
    try {
      const events = await this.stripeAPI.events.list({
        delivery_success: false,
      })
      return events
    } catch (error) {
      this.handleError(error)
    }
  }
}

export const stripe = new StripeService()
