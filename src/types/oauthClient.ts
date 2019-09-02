export default /* GraphQL */ `
  extend type Query {
    oauthClient(input: OAuthClientInput!): OAuthClient @uncacheViewer
  }

  type OAuthClient {
    "Unique Client ID of this OAuth Client."
    id: ID!

    "App name"
    name: String!

    "App Description"
    description: String

    "URL for oauth client's official website"
    website: URL

    "URL for oauth client's avatar."
    avatar: URL

    "Client secret"
    secret: String! @authorize

    "Redirect URIs"
    redirectURIs: [URL!] @authorize

    "Grant Types"
    grantTypes: [GrantType!] @authorize
  }

  input OAuthClientInput {
    id: ID!
  }

  enum GrantType {
    authorization_code
    refresh_token
  }
`
