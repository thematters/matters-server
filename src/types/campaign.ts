import { AUTH_MODE, NODE_TYPES } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    campaign(input: CampaignInput!): Campaign @logCache(type: "${NODE_TYPES.Campaign}")
  }

  extend type Mutation {
    putWritingChallenge(input:PutWritingChallengeInput!): Campaign! @auth(mode: "${AUTH_MODE.admin}")
  }

  input CampaignInput {
    shotHash: String!
  }

  input PutWritingChallengeInput {
    id: ID
    name: [TranslationInput!]
    description: [TranslationInput!]
    cover: ID
    applicationPeriod: DatetimeRangeInput
    writingPeriod: DatetimeRangeInput
    stages: [CampaignStageInput!]
    state: CampaignState
  }

  input CampaignStageInput {
    name: [TranslationInput!]
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
    name:String!
    description: String!
    state: CampaignState!
  }

  enum CampaignState {
    pending
    active
    finished
    archived
  }

  extend enum AssetType {
    campaignCover
  }

  type WritingChallenge implements Node & Campaign {

    id: ID!
    shortHash: String!
    name:String!
    description: String!
    cover: Asset
    link: String!

    applicationPeriod: DatetimeRange!
    writingPeriod:DatetimeRange!
    stages: [CampaignStage]!

    state: CampaignState!
    participants(input: ConnectionArgs!): UserConnection!
    articles(input: CampaignArticlesInput): ArticleConnection!

    applicationState: CampaignApplicationState @auth(mode: "${AUTH_MODE.oauth}")
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
    name: String!
    period: DatetimeRange
  }

  input CampaignArticlesInput {
    after: String
    first: Int
    filter: CampaignArticlesFilter
  }

  input CampaignArticlesFilter{
    stage: String!
  }
`
