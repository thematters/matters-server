import { Router } from 'express'

import likecoin from './likecoin.js'
import stripeConnect from './stripe/connect/index.js'
import stripe from './stripe/index.js'

const payRouter = Router()

payRouter.use('/likecoin', likecoin)
payRouter.use('/stripe', stripe)
payRouter.use('/stripe/connect', stripeConnect)

export const pay = payRouter
