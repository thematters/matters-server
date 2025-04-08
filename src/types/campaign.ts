import { AUTH_MODE, NODE_TYPES, CACHE_TTL } from '#common/enums/index.js'

export default /* GraphQL */ `
  extend type Query {
    campaign(input: CampaignInput!): Campaign @privateCache @logCache(type: "${NODE_TYPES.Campaign}")
    campaigns(input: CampaignsInput!): CampaignConnection! @privateCache
  }

  extend type Mutation {
    putWritingChallenge(input: PutWritingChallengeInput!): WritingChallenge! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Campaign}")
    applyCampaign(input: ApplyCampaignInput!): Campaign! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Campaign}")
    updateCampaignApplicationState(input: UpdateCampaignApplicationStateInput!): Campaign! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Campaign}")
    toggleWritingChallengeFeaturedArticles(input: ToggleWritingChallengeFeaturedArticlesInput!): Campaign! @purgeCache(type: "${NODE_TYPES.Campaign}")
    removeCampaignArticles(input: RemoveCampaignArticlesInput!): Campaign! @purgeCache(type: "${NODE_TYPES.Campaign}")
    sendCampaignAnnouncement(input: SendCampaignAnnouncementInput!): Boolean @auth(mode: "${AUTH_MODE.admin}")
  }

  input CampaignInput {
    shortHash: String!
  }

  input CampaignsInput {
    after: String
    first: Int
    "return pending and archived campaigns"
    oss: Boolean = false
  }

  input PutWritingChallengeInput {
    id: ID
    name: [TranslationInput!]
    cover: ID
    link: String
    announcements: [ID!]
    applicationPeriod: DatetimeRangeInput
    writingPeriod: DatetimeRangeInput
    stages: [CampaignStageInput!]
    state: CampaignState
    featuredDescription: [TranslationInput!]
    channelEnabled: Boolean
    adminUsers: [ID!]
  }

  input ApplyCampaignInput {
    id: ID!
  }

  input UpdateCampaignApplicationStateInput {
    campaign: ID!
    user: ID!
    state: CampaignApplicationState!
  }

  input ToggleWritingChallengeFeaturedArticlesInput {
    campaign: ID!
    articles: [ID!]!
    enabled: Boolean!
  }

  input RemoveCampaignArticlesInput {
    campaign: ID!
    articles: [ID!]!
  }

  input SendCampaignAnnouncementInput {
    campaign: ID!
    announcement: [TranslationInput!]!
    link: String! @constraint(format: "uri")
    password: String! # admin verification
  }

  input CampaignStageInput {
    name: [TranslationInput!]!
    description: [TranslationInput!]
    period: DatetimeRangeInput
  }

  input TranslationInput {
    language: UserLanguage!
    text: String!
  }

  input DatetimeRangeInput {
    start: DateTime!
    end: DateTime
  }

  interface Campaign {
    id: ID!
    shortHash: String!
    name: String!
    state: CampaignState!
  }

  enum CampaignState {
    pending
    active
    finished
    archived
  }

  type WritingChallenge implements Node & Campaign & Channel {
    id: ID!
    shortHash: String!
    name(input: TranslationArgs): String!
    description(input: TranslationArgs): String
    cover: String
    link: String!
    announcements: [Article!]!

    applicationPeriod: DatetimeRange
    writingPeriod: DatetimeRange
    stages: [CampaignStage!]!

    channelEnabled: Boolean!
    state: CampaignState!
    participants(input: CampaignParticipantsInput!): CampaignParticipantConnection!
    articles(input: CampaignArticlesInput!): CampaignArticleConnection!

    application: CampaignApplication @privateCache

    featuredDescription(input: TranslationArgs): String!

    oss: CampaignOSS! @auth(mode: "${AUTH_MODE.admin}")
  }

  type CampaignOSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    adminUsers: [User!]!
    boost: Float!
  }

  type CampaignApplication {
    state: CampaignApplicationState!
    createdAt: DateTime!
  }

  type CampaignParticipantConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [CampaignParticipantEdge!]
  }

  type CampaignParticipantEdge {
    cursor: String!
    application: CampaignApplication
    node: User! @logCache(type: "${NODE_TYPES.User}")
  }

  type CampaignArticleConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [CampaignArticleEdge!]!
  }

  type CampaignArticleEdge {
    cursor: String!
    node: Article! @logCache(type: "${NODE_TYPES.Article}")
    featured: Boolean!
    announcement: Boolean!
  }

  input CampaignParticipantsInput {
    after: String
    first: Int
    "return all state participants"
    oss: Boolean = false
  }

  type DatetimeRange {
    start: DateTime!
    end: DateTime
  }

  enum CampaignApplicationState {
    pending
    succeeded
    rejected
  }

  type CampaignStage {
    id: ID!
    name(input: TranslationArgs): String!
    description(input: TranslationArgs): String!
    period: DatetimeRange
  }

  input CampaignArticlesInput {
    after: String
    first: Int
    filter: CampaignArticlesFilter
  }

  input CampaignArticlesFilter{
    stage: ID
    featured: Boolean
  }

  type CampaignConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [CampaignEdge!]
  }

  type CampaignEdge {
    cursor: String!
    node: Campaign! @logCache(type: "${NODE_TYPES.Campaign}")
  }
`
