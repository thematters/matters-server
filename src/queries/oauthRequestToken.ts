import type { GQLResolvers } from '#definitions/index.js'

import { getLogger } from '#common/logger.js'
import { Twitter } from '#connectors/oauth/index.js'

const logger = getLogger('resovler-oauthRequestToken')

const oauthRequestToken: GQLResolvers = {
  Query: {
    oauthRequestToken: async () => {
      const twitter = new Twitter()
      try {
        return await twitter.requestToken()
      } catch (err: any) {
        logger.error(err)
        return null
      }
    },
  },
}

export default oauthRequestToken
