import { AUTH_MODE, NODE_TYPES } from '#common/enums/index.js'

export default /* GraphQL */ `
  extend type Query {
    channel(input: ChannelInput!): Channel @privateCache @logCache(type: "${NODE_TYPES.Channel}")
    channels(input: ChannelsInput): [Channel!]! @privateCache @logCache(type: "${NODE_TYPES.Channel}")
  }

  interface Channel {
    id: ID!
    shortHash: String!
  }

  type TopicChannel implements Channel {
    id: ID!
    shortHash: String!

    name(input: TranslationArgs): String!
    note(input: TranslationArgs): String
    providerId: String! @auth(mode: "${AUTH_MODE.admin}")

    enabled: Boolean!

    articles(input: ConnectionArgs!): ArticleConnection! @complexity(multipliers: ["input.first"], value: 1)
  }

  type CurationChannel implements Channel {
    id: ID!
    shortHash: String!

    name(input: TranslationArgs): String!
    note(input: TranslationArgs): String
    pinAmount: Int!
    color: Color!
    "both activePeriod and state determine if the channel is active"
    activePeriod: DatetimeRange
    state: CurationChannelState!
    articles(input: ConnectionArgs!): ArticleConnection! @complexity(multipliers: ["input.first"], value: 1)
  }

  input ChannelInput {
    shortHash: String!
  }

  input ChannelsInput {
    "return all channels if true, only active channels by default"
    oss: Boolean = false
  }

  extend type Mutation {
    putTopicChannel(input: PutTopicChannelInput!): TopicChannel! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Channel}")
    putCurationChannel(input: PutCurationChannelInput!): CurationChannel! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Channel}")
    "set article's channels, only accept topic channels and curation channels"
    setArticleChannels(input: SetArticleChannelsInput!): Article! @auth(mode: "${AUTH_MODE.admin}")
    reorderChannels(input: ReorderChannelsInput!): Boolean! @auth(mode: "${AUTH_MODE.admin}")
    classifyArticlesChannels(input: ClassifyArticlesChannelsInput!): Boolean! @auth(mode: "${AUTH_MODE.admin}")
  }

  input PutTopicChannelInput {
    id: ID!
    name: [TranslationInput!]
    note: [TranslationInput!]
    enabled: Boolean
  }

  input PutCurationChannelInput {
    id: ID
    name: [TranslationInput!]
    note: [TranslationInput!]
    pinAmount: Int
    color: Color
    activePeriod: DatetimeRangeInput
    state: CurationChannelState
  }

  input SetArticleChannelsInput {
    id: ID!
    channels: [ID!]!
  }

  input ReorderChannelsInput {
    ids: [ID!]!
  }

  input ClassifyArticlesChannelsInput {
    ids: [ID!]!
  }

  enum CurationChannelState {
    editing
    published
    archived
  }

  enum Color {
    gray
    brown
    orange
    yellow
    green
    purple
    pink
    red
  }
`
