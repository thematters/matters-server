import { Router } from 'express'

import stripe from './stripe'

const webhookRouter = Router()

webhookRouter.use('/stripe', stripe)

export const webhook = webhookRouter
