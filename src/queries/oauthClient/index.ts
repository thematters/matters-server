import avatar from './avatar.js'
import rootOAuthClient from './rootOAuthClient.js'
import user from './user.js'

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
