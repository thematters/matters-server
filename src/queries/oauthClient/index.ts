import rootOAuthClient from './rootOAuthClient'
import avatar from './avatar'

export default {
  Query: {
    oauthClient: rootOAuthClient
  },
  OAuthClient: {
    id: ({ clientId }: { clientId: string }) => {
      console.log('clientId', clientId)
      return clientId
    },
    avatar,
    website: ({ websiteUrl }: { websiteUrl: string }) => {
      console.log(websiteUrl, 'websiteUrl')
      return websiteUrl
    }
  }
}
