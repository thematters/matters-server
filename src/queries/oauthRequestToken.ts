import type { GQLResolvers } from 'definitions'

import { getLogger } from 'common/logger'
import { Twitter } from 'connectors/oauth'

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
