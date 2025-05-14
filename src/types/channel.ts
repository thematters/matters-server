import { AUTH_MODE, NODE_TYPES, CACHE_TTL } from '#common/enums/index.js'

export default /* GraphQL */ `
  extend type Query {
    channel(input: ChannelInput!): Channel @logCache(type: "${NODE_TYPES.Channel}")
    channels(input: ChannelsInput): [Channel!]! @logCache(type: "${NODE_TYPES.Channel}") @cacheControl(maxAge: ${CACHE_TTL.SHORT})
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
    providerId: String! @auth(mode: "${AUTH_MODE.admin}") @privateCache

    enabled: Boolean!

    articles(input: ChannelArticlesInput!): ChannelArticleConnection! @privateCache @complexity(multipliers: ["input.first"], value: 1)
  }

  type CurationChannel implements Channel {
    id: ID!
    shortHash: String!

    name(input: TranslationArgs): String!
    note(input: TranslationArgs): String
    pinAmount: Int!
    color: Color!
    "both activePeriod and state determine if the channel is active"
    activePeriod: DatetimeRange!
    state: CurationChannelState! @auth(mode: "${AUTH_MODE.admin}") @cacheControl(maxAge: ${CACHE_TTL.INSTANT})
    articles(input: ChannelArticlesInput!): ChannelArticleConnection! @privateCache @complexity(multipliers: ["input.first"], value: 1)
  }

  input ChannelArticlesInput {
    after: String
    first: Int
    sort: ArticlesSort
    filter: ChannelArticlesFilter
  }


  input ChannelArticlesFilter {
    datetimeRange: DatetimeRangeInput
  }

  input ChannelInput {
    shortHash: String!
  }

  input ChannelsInput {
    "return all channels if true, only active channels by default"
    oss: Boolean = false
  }

  type ChannelArticleConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ChannelArticleEdge!]
  }

  type ChannelArticleEdge {
    cursor: String!
    node: Article! @logCache(type: "${NODE_TYPES.Article}")
    pinned: Boolean!
  }

  extend type Mutation {
    putTopicChannel(input: PutTopicChannelInput!): TopicChannel! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.TopicChannel}")
    putCurationChannel(input: PutCurationChannelInput!): CurationChannel! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.CurationChannel}")
    setArticleTopicChannels(input: SetArticleTopicChannelsInput!): Article! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Article}")
    addCurationChannelArticles(input: AddCurationChannelArticlesInput!): CurationChannel! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.CurationChannel}")
    deleteCurationChannelArticles(input: DeleteCurationChannelArticlesInput!): CurationChannel! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.CurationChannel}")
    togglePinChannelArticles(input: TogglePinChannelArticlesInput!): Channel! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Channel}")
    reorderChannels(input: ReorderChannelsInput!): Boolean! @auth(mode: "${AUTH_MODE.admin}")
    classifyArticlesChannels(input: ClassifyArticlesChannelsInput!): Boolean! @auth(mode: "${AUTH_MODE.admin}")
  }

  input AddCurationChannelArticlesInput {
    channel: ID!
    articles: [ID!]!
  }

  input DeleteCurationChannelArticlesInput {
    channel: ID!
    articles: [ID!]!
  }

  input TogglePinChannelArticlesInput {
    "id of TopicChannel or CurationChannel"
    channel: ID!
    articles: [ID!]!
    pinned: Boolean!
  }

  input PutTopicChannelInput {
    id: ID
    providerId: String
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

  input SetArticleTopicChannelsInput {
    id: ID!
    channels: [ID!]!
  }

  input ReorderChannelsInput {
    "ids of TopicChannels, CurationChannels, and WritingChallenges"
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
