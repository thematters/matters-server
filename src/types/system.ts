import { CACHE_TTL } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node @privateCache @logCache(type: "Node")
    frequentSearch(input: FrequentSearchInput!): [String!]
    search(input: SearchInput!): SearchResultConnection! @privateCache
    official: Official!
    oss: OSS! @authorize @cacheControl(maxAge: ${CACHE_TTL.INSTANT}, scope: PRIVATE)
  }

  extend type Mutation {
    "Upload a single file."
    singleFileUpload(input: SingleFileUploadInput!): Asset! @authenticate

    "Delete a uploaded file."
    singleFileDelete(input: SingleFileDeleteInput!): Boolean! @authenticate

    feedback(input: FeedbackInput!): Boolean

    "Add specific user behavior record."
    logRecord(input: LogRecordInput!): Boolean

    ##############
    #     OSS    #
    ##############
    setBoost(input: SetBoostInput!): Node! @authorize
    putRemark(input: PutRemarkInput!): String @authorize
    putSkippedListItem(input: PutSkippedListItemInput!): [SkippedListItem!] @authorize
    setFeatureFlag(input: SetFeatureFlagInput!): FeatureFlag! @authorize
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
    hasPreviousPage: Boolean!
  }

  interface Connection {
    totalCount: Int!
    pageInfo: PageInfo!
  }

  "This type contains system-wise settings."
  type Official {
    reportCategory: [Category!]!
    feedbackCategory: [Category!]!
    releases(input: ReleasesInput!): [Release!]

    "Links of specific pages on Matters site."
    links: OfficialLinks!
    placements: Placements!

    "IPFS node address"
    ipfsAddress: [String!]!

    "Feature flag"
    features: [Feature!]!
  }

  type Feature {
    name: String!
    flag: FeatureFlag!
  }

  type OSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    users(input: ConnectionArgs!): UserConnection!
    comments(input: ConnectionArgs!): CommentConnection!
    articles(input: OSSArticlesInput!): ArticleConnection!
    tags(input: TagsInput!): TagConnection!
    reports(input: ReportsInput!): ReportConnection!
    report(input: ReportInput!): Report!
    today(input: ConnectionArgs!): ArticleConnection!
    oauthClients(input: ConnectionArgs!): OAuthClientConnection!
    skippedListItems(input: ConnectionArgs!): SkippedListItemsConnection!
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

  """
  This type contains type, link and related data of an asset.
  """
  type Asset {
    "Unique ID of this Asset."
    id: ID!

    "Types of this asset."
    type: AssetType!

    "Link of this asset."
    path: String!

    "Time of this asset was created."
    createdAt: DateTime!
  }

  type SearchResultConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [SearchResultEdge!]
  }

  type SearchResultEdge {
    cursor: String!
    node: Node!
  }

  type ReportConnection implements Connection {
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
    description: String
    assets: [URL!]
    contact: String
    createdAt: DateTime!
    remark: String @authorize
  }

  type ReportEdge {
    cursor: String!
    node: Report!
  }

  type SkippedListItemsConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [SkippedListItemEdge!]
  }

  type SkippedListItemEdge {
    cursor: String!
    node: SkippedListItem
  }

  type SkippedListItem {
    id: ID!
    uuid: UUID!
    type: SkippedListItemType!
    value: String!
    archived: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input NodeInput {
    id: ID!
  }

  input OSSArticlesInput {
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
    oss: Boolean
  }

  input ReleasesInput {
    platform: PlatformType!
    channel: ChannelType!
    first: Int
  }

  input SingleFileUploadInput {
    type: AssetType!
    file: Upload
    url: URL
    entityType: EntityType!
    entityId: ID
  }

  input SingleFileDeleteInput {
    id: ID!
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

  input PutSkippedListItemInput {
    id: ID!
    archived: Boolean!
  }

  input LogRecordInput {
    type: LogRecordTypes!
  }

  input ConnectionArgs {
    after: String
    first: Int
    oss: Boolean
  }

  "Common input to toggle single item for \`toggleXXX\` mutations"
  input ToggleItemInput {
    id: ID!
    enabled: Boolean
  }

  input SetFeatureFlagInput {
    feature: FeatureName!
    flag: FeatureFlag!
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

  enum LogRecordTypes {
    ReadFolloweeArticles
    ReadResponseInfoPopUp
  }

  "Enums for asset types."
  enum AssetType {
    avatar
    cover
    audiodraft
    report
    feedback
    embed
    embedaudio
    profileCover
    oauthClientAvatar
  }

  enum EntityType {
    article
    draft
    user
  }

  enum PlatformType {
    ios
    android
  }

  enum ChannelType {
    appStore
    googlePlay
  }

  "Enums for user roles."
  enum Role {
    vistor
    user
    admin
  }

  enum CacheScope {
    PUBLIC
    PRIVATE
  }

  enum SkippedListItemType {
    agent_hash
    email
  }

  enum FeatureName {
    add_credit
    payment
    payout
  }

  enum FeatureFlag {
    on
    off
    admin_only
  }

  input CostComplexity {
    min: Int = 1
    max: Int
  }

  directive @cacheControl(
    maxAge: Int
    scope: CacheScope
  ) on OBJECT | FIELD | FIELD_DEFINITION

  directive @cost(
    multipliers: [String]
    useMultipliers: Boolean
    complexity: CostComplexity
  ) on OBJECT | FIELD_DEFINITION

  directive @deprecated(
    reason: String = "No longer supported"
  ) on FIELD_DEFINITION | ENUM_VALUE

  directive @authenticate(requires: Role = user) on OBJECT | FIELD_DEFINITION

  directive @authorize(requires: Role = admin) on OBJECT | FIELD_DEFINITION

  directive @private on FIELD_DEFINITION

  directive @scope on FIELD_DEFINITION

  directive @purgeCache on FIELD_DEFINITION

  directive @privateCache(strict: Boolean! = false) on FIELD_DEFINITION

  directive @logCache(type: String!) on FIELD_DEFINITION

  directive @objectCache(maxAge: Int = 1000) on OBJECT | FIELD_DEFINITION
`
