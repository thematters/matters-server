import { Router } from 'express'

const authorizeRouter = Router()

authorizeRouter.get('/', (req, res, next) => {
  res.send('TBC')
})

authorizeRouter.post('/', (req, res, next) => {
  res.status(405)
})

export default authorizeRouter
