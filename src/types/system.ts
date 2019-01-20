export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node
    frequentSearch(input: FrequentSearchInput!): [String!]
    search(input: SearchInput!): SearchResultConnection!
    official: Official!
    oss: OSS! @authorize
  }

  extend type Mutation {
    singleFileUpload(input: SingleFileUploadInput!): Asset!  @authenticate
    feedback(input: FeedbackInput!): Boolean
    setBoost(input: SetBoostInput!): Node! @authorize
    putRemark(input: PutRemarkInput!): String @authorize
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
    tags(input: ConnectionArgs!): TagConnection!
    reports(input: ReportsInput!): ReportConnection!
    report(input: ReportInput!): Report!
    today(input: ConnectionArgs!): ArticleConnection!
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

  type Asset {
    id: ID!
    type: AssetType!
    path: String!
    createdAt: DateTime!
  }

  type SearchResultConnection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [SearchResultEdge!]
  }

  type SearchResultEdge {
    cursor: String!
    node: Node!
  }

  type ReportConnection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ReportEdge!]
  }

  type Report {
    id: ID!
    user: User
    article: Article
    comment: Comment
    category: String!
    description: String!
    assets: [URL!]
    contact: String
    createdAt: DateTime!
    remark: String @authorize
  }

  type ReportEdge {
    cursor: String!
    node: Report!
  }

  input NodeInput {
    id: ID!
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

  input ReportsInput {
    article: Boolean!
    comment: Boolean!
    after: String
    first: Int
  }

  input ReportInput {
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

  input SetBoostInput {
    id: ID!
    boost: NonNegativeFloat!
    type: BoostTypes!
  }

  input PutRemarkInput {
    id: ID!
    remark: String!
    type: RemarkTypes!
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

  enum BoostTypes {
    Article
    User
    Tag
  }

  enum RemarkTypes {
    Article
    User
    Tag
    Comment
    Report
    Feedback
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

  enum Role {
    vistor
    user
    admin
  }

  directive @deprecated(
    reason: String = "No longer supported"
  ) on FIELD_DEFINITION | ENUM_VALUE

  directive @authenticate(
    requires: Role = user,
  ) on OBJECT | FIELD_DEFINITION

  directive @authorize(
    requires: Role = admin,
  ) on OBJECT | FIELD_DEFINITION

  directive @private on FIELD_DEFINITION
`
