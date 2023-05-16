import Stripe from 'stripe'

import {
  COUNTRY_CODE,
  LOCAL_STRIPE,
  METADATA_KEY,
  OAUTH_CALLBACK_ERROR_CODE,
  PAYMENT_CURRENCY,
  PAYMENT_MAX_DECIMAL_PLACES,
} from 'common/enums'
import { environment, isProd, isTest } from 'common/environment'
import { PaymentAmountInvalidError, ServerError } from 'common/errors'
import { getLogger } from 'common/logger'
import {
  getUTCNextMonday,
  getUTCNextMonthDayOne,
  toProviderAmount,
} from 'common/utils'
import SlackService from 'connectors/slack'
import { User } from 'definitions'

const logger = getLogger('service-stripe')

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
      apiVersion: '2020-08-27',
      ...options,
    })
  }

  handleError(err: Stripe.StripeError) {
    const slack = new SlackService()

    logger.error(err)

    switch (err.code) {
      case 'parameter_invalid_integer':
        throw new PaymentAmountInvalidError(
          `maximum ${PAYMENT_MAX_DECIMAL_PLACES} decimal places`
        )
      default:
        slack.sendStripeAlert({
          data: { type: err.type, code: err.code },
          message: err.message,
        })
        throw new ServerError(
          `failed to process the stripe request: ${err.message}`
        )
    }
  }

  /**
   * Customer
   */
  createCustomer = async ({ user }: { user: User }) => {
    logger.info('create customer for user %s', user.id)
    try {
      return await this.stripeAPI.customers.create({
        email: user.email,
        metadata: { [METADATA_KEY.USER_ID]: user.id },
      })
    } catch (err) {
      this.handleError(err)
    }
  }

  updateCustomer = async ({
    id,
    paymentMethod,
  }: {
    id: string
    paymentMethod: string
  }) => {
    logger.info('update customer %s with payment method %s', id, paymentMethod)
    try {
      return await this.stripeAPI.customers.update(id, {
        invoice_settings: {
          default_payment_method: paymentMethod,
        },
      })
    } catch (err) {
      this.handleError(err)
    }
  }

  getPaymentMethod = async (id: string) => {
    try {
      return await this.stripeAPI.paymentMethods.retrieve(id)
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
    logger.info('create payment intent for customer %s', customerId)
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
    logger.info('create setup intent for customer %s', customerId)
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
   * Create Stripe Connect account and obtain the login link for onboarding
   *
   * @see {@url https://stripe.com/docs/connect/service-agreement-types}
   */
  createExpressAccount = async ({
    country,
    user,
  }: {
    country: keyof typeof COUNTRY_CODE
    user: User
  }) => {
    const isUS = country === 'UnitedStates'
    const returnUrlPrefix = `https://${environment.siteDomain}/oauth/stripe-connect`

    logger.info('create express account for user %s', user.id)
    try {
      const account = await this.stripeAPI.accounts.create({
        type: 'express',
        country: COUNTRY_CODE[country],
        email: user.email,
        metadata: { [METADATA_KEY.USER_ID]: user.id },
        capabilities: { transfers: { requested: true } },
        ...(isUS ? {} : { tos_acceptance: { service_agreement: 'recipient' } }),
      })
      const { url } = await this.stripeAPI.accountLinks.create({
        account: account.id,
        type: 'account_onboarding',
        refresh_url: `${returnUrlPrefix}/failure?code=${OAUTH_CALLBACK_ERROR_CODE.stripeAccountRefresh}`,
        return_url: `${returnUrlPrefix}/success`,
      })
      return {
        accountId: account.id,
        country: account.country,
        currency: account.default_currency,
        onboardingUrl: url,
      }
    } catch (err) {
      this.handleError(err)
    }
  }

  createExpressLoginLink = async (accountId: string) => {
    const { url } = await this.stripeAPI.accounts.createLoginLink(accountId)
    return url
  }

  /**
   * Transfer and Payout
   *
   * @see {url https://stripe.com/docs/connect/cross-border-payouts}
   */
  transfer = async ({
    amount,
    currency,
    recipientStripeConnectedId,
    txId,
  }: {
    amount: number
    currency: PAYMENT_CURRENCY
    recipientStripeConnectedId: string
    txId: string
  }) => {
    logger.info(
      'transfer[%s] %s %s to %s',
      txId,
      amount,
      currency,
      recipientStripeConnectedId
    )
    try {
      return await this.stripeAPI.transfers.create({
        amount: toProviderAmount({ amount }),
        currency,
        destination: recipientStripeConnectedId,
        metadata: { [METADATA_KEY.TX_ID]: txId },
      })
    } catch (error) {
      this.handleError(error)
    }
  }

  /**
   * Product & Price
   */
  createProduct = async ({ name, owner }: { name: string; owner: string }) => {
    logger.info('create product %s for user %s', name, owner)
    try {
      return await this.stripeAPI.products.create({
        name,
        metadata: { [METADATA_KEY.USER_ID]: owner },
      })
    } catch (error) {
      this.handleError(error)
    }
  }

  updateProduct = async ({ id, name }: { id: string; name: string }) => {
    logger.info('update product %s to %s', id, name)
    try {
      return await this.stripeAPI.products.update(id, { name })
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
    interval: 'month' | 'week'
    productId: string
  }) => {
    logger.info(
      'create price %s %s %s for product %s',
      amount,
      currency,
      interval,
      productId
    )
    try {
      return await this.stripeAPI.prices.create({
        currency,
        product: productId,
        recurring: { interval },
        unit_amount: toProviderAmount({ amount }),
      })
    } catch (error) {
      this.handleError(error)
    }
  }

  /**
   * Subscription
   */
  createSubscription = async ({
    customer,
    price,
  }: {
    customer: string
    price: string
  }) => {
    logger.info(
      'create subscription for customer %s with price %s',
      customer,
      price
    )
    try {
      const trialEndAt =
        (isProd ? getUTCNextMonthDayOne() : getUTCNextMonday()) / 1000

      return await this.stripeAPI.subscriptions.create({
        trial_end: trialEndAt,
        customer,
        items: [{ price }],
        proration_behavior: 'none',
      })
    } catch (error) {
      this.handleError(error)
    }
  }

  cancelSubscription = async (id: string) => {
    logger.info('cancel subscription %s', id)
    try {
      return await this.stripeAPI.subscriptions.del(id, { prorate: false })
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
    logger.info(
      'create subscription item %s for subscription %s',
      price,
      subscription
    )
    try {
      return await this.stripeAPI.subscriptionItems.create({
        price,
        proration_behavior: 'none',
        quantity: 1,
        subscription,
      })
    } catch (error) {
      this.handleError(error)
    }
  }

  deleteSubscriptionItem = async (id: string) => {
    logger.info('delete subscription item %s', id)
    try {
      return await this.stripeAPI.subscriptionItems.del(id, {
        proration_behavior: 'none',
      })
    } catch (error) {
      this.handleError(error)
    }
  }

  listSubscriptionItems = async (id: string) => {
    try {
      return await this.stripeAPI.subscriptionItems.list({
        subscription: id,
        limit: 100,
      })
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
}

export const stripe = new StripeService()
