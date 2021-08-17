import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node @privateCache @logCache(type: "${NODE_TYPES.Node}")
    nodes(input: NodesInput!): [Node!] @privateCache @logCache(type: "${NODE_TYPES.Node}")
    frequentSearch(input: FrequentSearchInput!): [String!] @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_SEARCH})
    search(input: SearchInput!): SearchResultConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @privateCache @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_SEARCH})
    official: Official! @privateCache
    oss: OSS! @auth(mode: "${AUTH_MODE.admin}") @privateCache
  }

  extend type Mutation {
    "Upload a single file."
    singleFileUpload(input: SingleFileUploadInput!): Asset! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")

    "Add specific user behavior record."
    logRecord(input: LogRecordInput!): Boolean

    ##############
    #     OSS    #
    ##############
    setBoost(input: SetBoostInput!): Node! @auth(mode: "${AUTH_MODE.admin}")
    putRemark(input: PutRemarkInput!): String @auth(mode: "${AUTH_MODE.admin}")
    putSkippedListItem(input: PutSkippedListItemInput!): [SkippedListItem!] @auth(mode: "${AUTH_MODE.admin}")
    setFeature(input: SetFeatureInput!): Feature! @auth(mode: "${AUTH_MODE.admin}")
    toggleSeedingUsers(input: ToggleSeedingUsersInput!): [User]! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.User}")
    putAnnouncement(input: PutAnnouncementInput!): Announcement! @auth(mode: "${AUTH_MODE.admin}")
    deleteAnnouncements(input: DeleteAnnouncementsInput!): Boolean @auth(mode: "${AUTH_MODE.admin}")
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

  "This type contains system-wise info and settings."
  type Official {
    "Feature flag"
    features: [Feature!]!

    "Announcements"
    announcements(input: AnnouncementsInput!): [Announcement!]
  }

  type Feature {
    name: FeatureName!
    enabled: Boolean!
  }

  type Announcement {
    id: ID!
    title: String
    cover: String
    content: String
    link: String
    type: AnnouncementType!
    visible: Boolean!
    order: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type OSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    users(input: ConnectionArgs!): UserConnection!
    comments(input: ConnectionArgs!): CommentConnection!
    articles(input: ConnectionArgs!): ArticleConnection!
    tags(input: TagsInput!): TagConnection!
    oauthClients(input: ConnectionArgs!): OAuthClientConnection!
    skippedListItems(input: SkippedListItemsInput!): SkippedListItemsConnection!
    seedingUsers(input: ConnectionArgs!): UserConnection!
    badgedUsers(input: BadgedUsersInput!): UserConnection!
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
    node: Node! @logCache(type: "${NODE_TYPES.Node}")
  }

  input TagsInput {
    after: String
    first: Int @constraint(min: 0)
    sort: TagsSort
  }

  input SkippedListItemsInput {
    after: String
    first: Int @constraint(min: 0)
    type: SkippedListItemType
  }

  input BadgedUsersInput {
    after: String
    first: Int @constraint(min: 0)
    type: BadgeType
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
    uuid: ID!
    type: SkippedListItemType!
    value: String!
    archived: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input NodeInput {
    id: ID!
  }

  input NodesInput {
    ids: [ID!]!
  }

  input FrequentSearchInput {
    key: String
    first: Int @constraint(min: 0)
  }

  input SearchInput {
    "search keyword"
    key: String!

    "types of search target"
    type: SearchTypes!

    after: String
    first: Int @constraint(min: 0)

    "extra query filter for searching"
    filter: SearchFilter

    "specific condition for rule data out"
    exclude: SearchExclude

    "whether this search operation should be recorded in search history"
    record: Boolean
    oss: Boolean
  }

  input SearchFilter {
    authorId: ID
  }

  input SingleFileUploadInput {
    type: AssetType!
    file: Upload
    url: String @constraint(format: "uri")
    entityType: EntityType!
    entityId: ID
  }

  input SetBoostInput {
    id: ID!
    boost: Float! @constraint(min: 0)
    type: BoostTypes!
  }

  input PutRemarkInput {
    id: ID!
    remark: String!
    type: RemarkTypes!
  }

  input PutSkippedListItemInput {
    id: ID
    type: SkippedListItemType
    value: String
    archived: Boolean
  }

  input LogRecordInput {
    type: LogRecordTypes!
  }

  input ConnectionArgs {
    after: String
    first: Int @constraint(min: 0)
    oss: Boolean
  }

  "Common input to toggle single item for \`toggleXXX\` mutations"
  input ToggleItemInput {
    id: ID!
    enabled: Boolean
  }

  input SetFeatureInput {
    name: FeatureName!
    flag: FeatureFlag!
  }

  input ToggleSeedingUsersInput {
    ids: [ID!]
    enabled: Boolean!
  }

  input AnnouncementsInput {
    id: ID
    visible: Boolean
  }

  input PutAnnouncementInput {
    id: ID
    title: String
    cover: String
    content: String
    link: String @constraint(format: "uri")
    type: AnnouncementType
    visible: Boolean
    order: Int
  }

  input DeleteAnnouncementsInput {
    ids: [ID!]
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
    ReadFollowingFeed
    ReadResponseInfoPopUp
  }

  "Enums for sorting tags."
  enum TagsSort {
    newest
    oldest
    hottest
  }

  "Enums for asset types."
  enum AssetType {
    avatar
    cover
    embed
    embedaudio
    profileCover
    oauthClientAvatar
    tagCover
    circleAvatar
    circleCover
    announcementCover
  }

  enum EntityType {
    article
    draft
    tag
    user
    circle
    announcement
  }

  "Enums for user roles."
  enum Role {
    vistor
    user
    admin
  }

  enum SkippedListItemType {
    agent_hash
    email
    domain
  }

  enum FeatureName {
    add_credit
    payment
    payout
    verify_appreciate
    fingerprint
    tag_adoption
    circle_management
    circle_interact
  }

  enum FeatureFlag {
    on
    off
    admin
    seeding
  }

  enum SearchExclude {
    blocked
  }

  enum AnnouncementType {
    community
    product
    seminar
  }

  ####################
  #    Directives    #
  ####################
  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  input CostComplexity {
    min: Int = 1
    max: Int
  }

  directive @constraint(
    # String constraints
    minLength: Int
    maxLength: Int
    startsWith: String
    endsWith: String
    contains: String
    notContains: String
    pattern: String
    format: String
    # Number constraints
    min: Int
    max: Int
    exclusiveMin: Int
    exclusiveMax: Int
    multipleOf: Int
    uniqueTypeName: String
  ) on INPUT_FIELD_DEFINITION | FIELD_DEFINITION

  directive @cacheControl(
    maxAge: Int
    scope: CacheControlScope
    inheritMaxAge: Boolean
  ) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

  directive @cost(
    multipliers: [String]
    useMultipliers: Boolean
    complexity: CostComplexity
  ) on OBJECT | FIELD_DEFINITION

  "Rate limit within a given period of time, in seconds"
  directive @rateLimit(period: Int!, limit: Int!) on FIELD_DEFINITION

  directive @deprecated(
    reason: String = "No longer supported"
  ) on FIELD_DEFINITION | ENUM_VALUE

  directive @auth(mode: String!, group: String) on FIELD_DEFINITION

  directive @privateCache(strict: Boolean! = false) on FIELD_DEFINITION

  directive @objectCache(maxAge: Int = 1000) on OBJECT | FIELD_DEFINITION

  directive @logCache(type: String!) on FIELD_DEFINITION

  directive @purgeCache(type: String!) on FIELD_DEFINITION
`
