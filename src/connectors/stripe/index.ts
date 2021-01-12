import Stripe from 'stripe'

import { PAYMENT_CURRENCY } from 'common/enums'
import { environment } from 'common/environment'
import { PaymentAmountInvalidError, ServerError } from 'common/errors'
import logger from 'common/logger'
import { toProviderAmount } from 'common/utils'
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
  stripe: Stripe

  constructor() {
    this.stripe = new Stripe(environment.stripeSecret, {
      apiVersion: '2020-03-02',
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
      return await this.stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      })
    } catch (err) {
      this.handleError(err)
    }
  }

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
      return await this.stripe.paymentIntents.create({
        customer: customerId,
        amount: toProviderAmount({ amount }),
        currency,
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
    return this.stripe.oauth.authorizeUrl(
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
    const { url } = await this.stripe.accounts.createLoginLink(accountId)
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

      return await this.stripe.paymentIntents.create({
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

  /**
   * Get customer portal URL
   */
  getCustomerPortal = async ({ customerId }: { customerId: string }) => {
    try {
      if (!environment.stripeReturnURL) {
        throw new ServerError('matters stripe return URL has not been set')
      }
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: environment.stripeReturnURL,
      })
      return session.url
    } catch (error) {
      this.handleError(error)
    }
  }
}

export const stripe = new StripeService()
