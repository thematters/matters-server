export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node
    frequentSearch(input: FrequentSearchInput!): [String!]
    search(input: SearchInput!): SearchResultConnection!
    official: Official!
    oss: OSS!
  }

  extend type Mutation {
    singleFileUpload(input: SingleFileUploadInput!): Asset!
    feedback(input: FeedbackInput!): Boolean
  }

  extend type Subscription {
    nodeEdited(input: NodeEditedInput!): Node!
  }

  interface Node {
    id: ID!
  }

  type PageInfo {
    startCursor: String
    endCursor: String
    hasNextPage: Boolean!
  }

  type Official {
    reportCategory: [Category!]!
    feedbackCategory: [Category!]!
    releases(input: ReleasesInput!): [Release!]
    links: OfficialLinks!
    placements: Placements!
    gatewayUrls: [URL!]
  }

  type OSS {
    users(input: UsersInput!): UserConnection!
    articles(input: ArticlesInput!): ArticleConnection!
  }

  type Category {
    id: ID!
    name: String!
  }

  type Release {
    title: String
    description: String
    cover: URL
    link: URL
    platform: PlatformType!
    channel: ChannelType!
    version: String!
    latest: Boolean!
    forceUpdate: Boolean!
    releasedAt: DateTime!
  }

  type OfficialLinks {
    beginnerGuide: URL!
    userGuide: URL!
    about: URL!
    faq: URL!
    tos: URL!
  }

  type Placements {
    webAsideTop: PlacementUnit!
    appSplash: PlacementUnit!
    appInStreamTop: PlacementUnit!
    appInStreamMiddle: PlacementUnit!
    appInStreamBottom: PlacementUnit!
    appInvitationTop: PlacementUnit!
  }

  type PlacementUnit {
    image: URL!
    link: URL!
    adLabel: Boolean!
  }

  input UsersInput {
    after: String
    first: Int
  }

  input ArticlesInput {
    public: Boolean
    after: String
    first: Int
  }

  type Asset {
    id: ID!
    type: AssetType!
    path: String!
    createdAt: DateTime!
  }

  type SearchResultConnection {
    pageInfo: PageInfo!
    edges: [SearchResultEdge!]
  }

  type SearchResultEdge {
    cursor: String!
    node: Node!
  }

  input NodeInput {
    id: ID!
  }

  input FrequentSearchInput {
    key: String
    first: Int
  }

  input NodeEditedInput {
    id: ID!
  }

  input SearchInput {
    key: String!
    type: SearchTypes!
    after: String
    first: Int
  }

  input ReleasesInput {
    platform: PlatformType!
    channel: ChannelType!
    first: Int
  }

  input SingleFileUploadInput {
    type: AssetType!
    file: Upload!
  }

  input FeedbackInput {
    category: ID!
    description: String
    assetIds: [ID!]
    contact: String
  }

  input ConnectionArgs {
    after: String
    first: Int
  }

  enum SearchTypes {
    Article
    User
    Tag
  }

  enum AssetType {
    avatar
    cover
    audiodraft
    report
    feedback
    embed
  }

  enum PlatformType {
    ios
    android
  }

  enum ChannelType {
    appStore
    googlePlay
  }
`
