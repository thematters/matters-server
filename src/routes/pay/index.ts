import { Router } from 'express'

import likecoin from './likecoin'
import stripe from './stripe'

const payRouter = Router()

payRouter.use('/likecoin', likecoin)
payRouter.use('/stripe', stripe)

export const pay = payRouter
