import type { GQLResolvers } from '#definitions/index.js'

import { getLogger } from '#common/logger.js'
import { Twitter } from '#connectors/oauth/index.js'
import * as Sentry from '@sentry/node'

const logger = getLogger('resovler-oauthRequestToken')

const oauthRequestToken: GQLResolvers = {
  Query: {
    oauthRequestToken: async () => {
      const twitter = new Twitter()
      try {
        return await twitter.requestToken()
      } catch (err: any) {
        Sentry.captureException(err)
        logger.error(err)
        return null
      }
    },
  },
}

export default oauthRequestToken
