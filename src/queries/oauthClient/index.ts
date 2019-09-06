import rootOAuthClient from './rootOAuthClient'
import avatar from './avatar'

export default {
  Query: {
    oauthClient: rootOAuthClient
  },
  OAuthClient: {
    id: ({ clientId }: { clientId: string }) => clientId,
    avatar,
    website: ({ websiteUrl }: { websiteUrl: string }) => websiteUrl
  }
}
