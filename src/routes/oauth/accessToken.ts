import { Router } from 'express'

const accessTokenRouter = Router()

accessTokenRouter.get('/', (req, res, next) => {
  res.status(405)
})

accessTokenRouter.post('/', (req, res, next) => {
  res.send('TBC')
})

export default accessTokenRouter
