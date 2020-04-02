import avatar from './avatar'
import rootOAuthClient from './rootOAuthClient'
import user from './user'

export default {
  Query: {
    oauthClient: rootOAuthClient,
  },
  OAuthClient: {
    id: ({ clientId }: { clientId: string }) => clientId,
    secret: ({ clientSecret }: { clientSecret: string }) =>
      clientSecret || null,
    redirectURIs: ({ redirectUri }: { redirectUri: string }) => redirectUri,
    avatar,
    user,
    website: ({ websiteUrl }: { websiteUrl: string }) => websiteUrl || null,
  },
}
