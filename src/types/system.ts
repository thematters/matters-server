export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node
    frequentSearch(key: String): [String!]
    search(input: SearchInput!): SearchResultConnection!
    official: Official!
    releases(input: ReleasesInput!): ReleaseConnection!
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

  type SearchResult {
    node: Node
    match: String
  }

  type Official {
    reportCategory: [String!]!
    feedbackCategory: [String!]!
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
    node: SearchResult!
  }

  type ReleaseConnection {
    pageInfo: PageInfo!
    edges: [ReleaseEdge!]
  }

  type ReleaseEdge {
    cursor: String!
    node: Release!
  }

  input NodeInput {
    id: ID!
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
    after: String
    first: Int
  }

  input SingleFileUploadInput {
    type: AssetType!
    file: Upload!
  }

  input FeedbackInput {
    category: String!
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
