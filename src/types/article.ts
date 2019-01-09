export default /* GraphQL */ `
  extend type Query {
    article(input: ArticleInput!): Article
    articles(input: ArticlesInput!): [Article!]
  }

  extend type Mutation {
    publishArticle(input: PublishArticleInput!): Draft!
    archiveArticle(input: ArchiveArticleInput!): Article!
    subscribeArticle(input: SubscribeArticleInput!): Boolean
    unsubscribeArticle(input: UnsubscribeArticleInput!): Boolean
    reportArticle(input: ReportArticleInput!): Boolean
    appreciateArticle(input: AppreciateArticleInput!): Article!
    readArticle(input: ReadArticleInput!): Boolean
    recallPublish(input: RecallPublishInput!): Draft!
    toggleArticleLive(input: ToggleArticleLiveInput!): Article!
    toggleArticlePublic(input: ToggleArticlePublicInput!): Article!
  }

  type Article implements Node {
    id: ID!
    slug: String!
    createdAt: DateTime!
    publishState: PublishState!
    public: Boolean!
    live: Boolean!
    author: User!
    title: String!
    cover: URL
    summary: String!
    tags: [Tag!]
    wordCount: Int
    dataHash: String
    mediaHash: String
    content: String!
    gatewayUrls: [URL!]
    upstream: Article
    downstreams(input: ConnectionArgs!): ArticleDownstreamConnection!
    relatedArticles(input: ConnectionArgs!): ArticleRelatedConnection!
    # MAT recieved for this article
    MAT: Int!
    participantCount: Int!
    subscribers(input: ConnectionArgs!): UserSubscribeConnection!
    appreciators(input: ConnectionArgs!): UserAppreciateConnection!
    appreciatorCount: Int!
    # Viewer has subscribed
    subscribed: Boolean!
    # Viewer has appreciate
    hasAppreciate: Boolean!
  }

  type Tag implements Node {
    id: ID!
    content: String!
    count: Int!
    articles(input: ConnectionArgs!): ArticleTagConnection!
  }

  type ArticleDownstreamConnection {
    pageInfo: PageInfo!
    edges: [ArticleDownstreamEdge!]
  }

  type ArticleDownstreamEdge {
    cursor: String!
    node: Article!
  }

  type ArticleRelatedConnection {
    pageInfo: PageInfo!
    edges: [ArticleRelatedEdge!]
  }

  type ArticleRelatedEdge {
    cursor: String!
    node: Article!
  }

  type UserSubscribeConnection {
    pageInfo: PageInfo!
    edges: [UserSubscribeEdge!]
  }

  type UserSubscribeEdge {
    cursor: String!
    node: User!
  }

  type UserAppreciateConnection {
    pageInfo: PageInfo!
    edges: [UserAppreciateEdge!]
  }

  type UserAppreciateEdge {
    cursor: String!
    node: User!
  }

  type ArticleTagConnection {
    pageInfo: PageInfo!
    edges: [ArticleTagEdge!]
  }

  type ArticleTagEdge {
    cursor: String!
    node: Article!
  }

  input ArticleInput {
    mediaHash: String!
  }

  input ArticlesInput {
    public: Boolean
    offset: Int
    limit: Int
  }

  input PublishArticleInput {
    id: ID!
    delay: Int
  }

  input ArchiveArticleInput {
    id: ID!
  }

  input SubscribeArticleInput {
    id: ID!
  }

  input UnsubscribeArticleInput {
    id: ID!
  }

  input ReportArticleInput {
    id: ID!
    category: String!
    description: String
    assetIds: [ID!]
  }

  input AppreciateArticleInput {
    id: ID!
    amount: Int
  }

  input ReadArticleInput {
    id: ID!
  }

  input RecallPublishInput {
    id: ID!
  }

  input ToggleArticleLiveInput {
    id: ID!
    enabled: Boolean!
  }

  input ToggleArticlePublicInput {
    id: ID!
    enabled: Boolean!
  }

  enum PublishState {
    archived
    pending
    error
    published
    banned
    recalled
  }
`
