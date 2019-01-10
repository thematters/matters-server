export default /* GraphQL */ `
  extend type Query {
    article(input: ArticleInput!): Article
    articles(input: ArticlesInput!): ArticleConnection!
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
    downstreams(input: ConnectionArgs!): ArticleConnection!
    relatedArticles(input: ConnectionArgs!): ArticleConnection!
    # MAT recieved for this article
    MAT: Int!
    participantCount: Int!
    subscribers(input: ConnectionArgs!): UserConnection!
    appreciators(input: ConnectionArgs!): UserConnection!
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
    articles(input: ConnectionArgs!): ArticleConnection!
  }

  type ArticleConnection {
    pageInfo: PageInfo!
    edges: [ArticleEdge!]
  }

  type ArticleEdge {
    cursor: String!
    node: Article!
  }

  type TagConnection {
    pageInfo: PageInfo!
    edges: [TagEdge]!
  }

  type TagEdge {
    cursor: String!
    node: Tag!
  }

  input ArticleInput {
    mediaHash: String!
  }

  input ArticlesInput {
    public: Boolean
    after: String
    first: Int
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
