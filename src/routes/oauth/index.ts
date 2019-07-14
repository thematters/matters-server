import accessTokenRouter from './accessToken'
import authorizeRouter from './authorize'

import { Router } from 'express'

const oAuthRouter = Router()

oAuthRouter.use('/authorize', authorizeRouter)
oAuthRouter.use('/access_token', accessTokenRouter)

export const oauth = oAuthRouter
