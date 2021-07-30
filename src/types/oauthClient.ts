import { AUTH_MODE, CACHE_TTL, NODE_TYPES } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    oauthClient(input: OAuthClientInput!): OAuthClient @cacheControl(maxAge: ${CACHE_TTL.INSTANT})
  }

  extend type Mutation {
    "Create or Update an OAuth Client, used in OSS."
    putOAuthClient(input: PutOAuthClientInput!): OAuthClient @auth(mode: "${AUTH_MODE.admin}")
  }

  type OAuthClient {
    "Unique Client ID of this OAuth Client."
    id: ID!

    "App name"
    name: String!

    "App Description"
    description: String

    "URL for oauth client's official website"
    website: String

    "Scopes"
    scope: [String!]

    "URL for oauth client's avatar."
    avatar: String

    "Client secret"
    secret: String! @auth(mode: "${AUTH_MODE.admin}")

    "Redirect URIs"
    redirectURIs: [String!] @auth(mode: "${AUTH_MODE.admin}")

    "Grant Types"
    grantTypes: [GrantType!] @auth(mode: "${AUTH_MODE.admin}")

    "Linked Developer Account"
    user: User @logCache(type: "${NODE_TYPES.User}")

    "Creation Date"
    createdAt: DateTime!
  }

  type OAuthClientConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [OAuthClientEdge!]
  }

  type OAuthClientEdge {
    cursor: String!
    node: OAuthClient!
  }

  input OAuthClientInput {
    id: ID!
  }

  input PutOAuthClientInput {
    id: ID
    name: String
    description: String
    website: String @constraint(format: "uri")
    scope: [String!]
    avatar: ID
    secret: String
    redirectURIs: [String!]
    grantTypes: [GrantType!]
    user: ID
  }

  enum GrantType {
    authorization_code
    refresh_token
  }
`
