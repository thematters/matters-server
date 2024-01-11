import crypto from 'crypto'
import { Router, urlencoded } from 'express'

import { SOCIAL_LOGIN_TYPE } from 'common/enums'
import { environment } from 'common/environment'
import { getLogger } from 'common/logger'
import { UserService } from 'connectors'

import { connections } from './connections'

type Data = {
  algorithm: string
  issued_at: number
  user_id: string
}

const logger = getLogger('route-facebook')

export const facebook = Router()

facebook.use(urlencoded({ extended: false }))

facebook.post('/delete/', async (req, res) => {
  const signedRequest = req.body.signed_request
  if (!signedRequest) {
    return res.status(400).send('Missing signed_request')
  }
  let data: Data
  try {
    data = parseSignedRequest(signedRequest, environment.facebookClientSecret)
  } catch (e) {
    logger.error('facebook callback error', { error: e })
    return res.status(400).send('Invalid signed_request')
  }
  logger.info('facebook callback data', { data })

  const facebookUserId = data.user_id
  const userId = await getUserId(facebookUserId)

  if (userId) {
    logger.info(`userId ${userId} facebook info is going to be deleted`)
    const userService = new UserService(connections)
    userService.removeSocialAccount(userId, SOCIAL_LOGIN_TYPE.Facebook)
  } else {
    logger.warn(`facebook info of ${facebookUserId} does not exist`)
  }

  const confirmationCode = facebookUserId
  const url = `https://${environment.serverDomain}/facebook/delete/?id=${confirmationCode}`
  res.type('json')
  res.send(JSON.stringify({ url, confirmation_code: confirmationCode }))
})

facebook.get('/delete/', async (req, res) => {
  const facebookUserId = req.query.id
  if (!facebookUserId) {
    return res.status(200).send('Missing id')
  }
  const userId = await getUserId(facebookUserId as string)
  if (!userId) {
    return res
      .status(200)
      .send(
        "This Facebook user's information does not exist or has been deleted."
      )
  } else {
    return res.status(200).send('Not deleted, please try again.')
  }
})

// helpers

const getUserId = async (facebookUserId: string) => {
  const res = await connections
    .knexRO('social_account')
    .select('user_id')
    .where({ type: 'Facebook', providerAccountId: facebookUserId })
    .first()
  return res?.user_id
}

const base64decode = (data: string) => {
  while (data.length % 4 !== 0) {
    data += '='
  }
  data = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(data, 'base64').toString('utf-8')
}

const parseSignedRequest = (signedRequest: string, secret: string): Data => {
  const encoded_data = signedRequest.split('.', 2) // decode the data
  const sig = encoded_data[0]
  const json = base64decode(encoded_data[1])
  const data = JSON.parse(json)
  if (!data.algorithm || data.algorithm.toUpperCase() !== 'HMAC-SHA256') {
    throw Error(
      'Unknown algorithm: ' + data.algorithm + '. Expected HMAC-SHA256'
    )
  }
  const expected_sig = crypto
    .createHmac('sha256', secret)
    .update(encoded_data[1])
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace('=', '')
  if (sig !== expected_sig) {
    throw Error('Invalid signature: ' + sig + '. Expected ' + expected_sig)
  }
  return data
}
