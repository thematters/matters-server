import { Router } from 'express'

import likecoin from './likecoin'
import stripe from './stripe'
import stripeConnect from './stripe/connect'

const payRouter = Router()

payRouter.use('/likecoin', likecoin)
payRouter.use('/stripe', stripe)
payRouter.use('/stripe/connect', stripeConnect)

export const pay = payRouter
