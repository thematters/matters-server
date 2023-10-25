import { Router } from 'express'

import { getLogger } from 'common/logger'
import { Twitter } from 'connectors/oauth'

const logger = getLogger('route-twitter')

export const twitter = Router()

twitter.get('/', async (req, res) => {
  const twitterOAuth = new Twitter()

  try {
    const token = await twitterOAuth.requestToken()
    return res.redirect(
      `https://api.twitter.com/oauth/authenticate?oauth_token=${token}`
    )
  } catch (error: any) {
    logger.error(error)
    return res.status(500).json({ message: error.message })
  }
})
