import { NextFunction, Request, Response } from 'express'
import querystring from 'querystring'
import Stripe from 'stripe'

import { OAUTH_CALLBACK_ERROR_CODE } from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { PaymentService } from 'connectors'

const stripe = new Stripe(environment.stripeSecret, {
  apiVersion: '2020-03-02',
})

/**
 * Complete the Stripe account connection
 *
 * @see {@url https://stripe.com/docs/connect/oauth-reference#post-token}
 */

const stripeConnectHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const paymentService = new PaymentService()

  const authCode = req.query.code
  const viewer = req.app.locals.viewer

  const redirectFailure = ({
    code,
    message,
  }: {
    code: any
    message: string
  }) => {
    const qs = querystring.stringify({ code, message })
    const url = `${environment.siteDomain}/oauth/stripe-connect/failure?${qs}`

    return res.redirect(url)
  }

  try {
    const { stripe_user_id: accountId } = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: authCode,
    })

    if (!accountId) {
      return redirectFailure({
        code: OAUTH_CALLBACK_ERROR_CODE.stripeAccountNotFound,
        message: 'accountid is required',
      })
    }

    await paymentService.createPayoutAccount({
      user: viewer,
      accountId,
    })
  } catch (err) {
    logger.error(err)

    return redirectFailure({
      code: OAUTH_CALLBACK_ERROR_CODE.stripeAuthFailed,
      message: err.error_description,
    })
  }

  res.redirect(`${environment.siteDomain}/oauth/stripe-connect/success`)
}

export default stripeConnectHandler
