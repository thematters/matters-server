import { AUTH_MODE, CACHE_TTL } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    channels: [Channel!]! @cacheControl(maxAge: ${CACHE_TTL.MEDIUM})
  }

  type Channel {
    id: ID!
    name(input: TranslationArgs): String!

    description: String @auth(mode: "${AUTH_MODE.admin}")
    providerId: String! @auth(mode: "${AUTH_MODE.admin}")
    enabled: Boolean! @auth(mode: "${AUTH_MODE.admin}")
  }

  extend type Mutation {
    putChannel(input: PutChannelInput!): Channel! @auth(mode: "${AUTH_MODE.admin}")
    setArticleChannels(input: SetArticleChannelsInput!): Article! @auth(mode: "${AUTH_MODE.admin}")
    classifyArticlesChannels(input: ClassifyArticlesChannelsInput!): Boolean! @auth(mode: "${AUTH_MODE.admin}")
  }

  input PutChannelInput {
    id: ID
    providerId: String!
    name: [TranslationInput!]
    description: String
    enabled: Boolean
  }

  input SetArticleChannelsInput {
    id: ID!
    channels: [ID!]!
  }

  input ClassifyArticlesChannelsInput {
    ids: [ID!]!
  }
`
