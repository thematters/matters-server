import { AUTH_MODE, NODE_TYPES } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    channels: [Channel!]! @logCache(type: "${NODE_TYPES.Channel}")
  }

  type Channel {
    id: ID!
    shortHash: String!
    name(input: TranslationArgs): String!

    description: String @auth(mode: "${AUTH_MODE.admin}")
    providerId: String! @auth(mode: "${AUTH_MODE.admin}")
    enabled: Boolean! @auth(mode: "${AUTH_MODE.admin}")

    articles(input: ConnectionArgs!): ArticleConnection! @complexity(multipliers: ["input.first"], value: 1)
  }

  extend type Mutation {
    putChannel(input: PutChannelInput!): Channel! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Channel}")
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
