import rootOAuthClient from './rootOAuthClient'
import avatar from './avatar'

export default {
  Query: {
    oauthClient: rootOAuthClient
  },
  OAuthClient: {
    id: ({ clientId }: { clientId: string }) => clientId,
    secret: ({ clientSecret }: { clientSecret: string }) => clientSecret,
    redirectURIs: ({ redirectUri }: { redirectUri: string }) => redirectUri,
    avatar,
    website: ({ websiteUrl }: { websiteUrl: string }) => websiteUrl
  }
}
