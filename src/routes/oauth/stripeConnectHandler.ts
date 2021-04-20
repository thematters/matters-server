import { invalidateFQC } from '@matters/apollo-response-cache'
import { NextFunction, Request, Response } from 'express'
import querystring from 'querystring'
import Stripe from 'stripe'

import { NODE_TYPES, OAUTH_CALLBACK_ERROR_CODE } from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { AtomService, CacheService, PaymentService } from 'connectors'

const stripe = new Stripe(environment.stripeSecret, {
  apiVersion: '2020-08-27',
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
  const atomService = new AtomService()
  const paymentService = new PaymentService()
  const cacheService = new CacheService()

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

  // check if viewer is valid
  if (!viewer.id) {
    return redirectFailure({
      code: OAUTH_CALLBACK_ERROR_CODE.userNotFound,
      message: 'viewer not found.',
    })
  }

  // check if viewer already has a payout account
  const payoutAccount = await atomService.findFirst({
    table: 'payout_account',
    where: { userId: viewer.id, archived: false },
  })

  if (payoutAccount) {
    return redirectFailure({
      code: OAUTH_CALLBACK_ERROR_CODE.stripeAccountExists,
      message: 'viewer already has a payout account.',
    })
  }

  try {
    const { stripe_user_id: accountId } = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: authCode,
    })

    if (!accountId) {
      return redirectFailure({
        code: OAUTH_CALLBACK_ERROR_CODE.stripeAccountNotFound,
        message: 'accountId is required.',
      })
    }

    // save to db
    await paymentService.createPayoutAccount({
      user: viewer,
      accountId,
    })

    // invalidate user cache
    await invalidateFQC({
      node: { type: NODE_TYPES.user, id: viewer.id },
      redis: cacheService.redis,
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
