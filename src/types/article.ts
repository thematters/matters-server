export default /* GraphQL */ `
  extend type Query {
    article(input: ArticleInput!): Article
  }

  extend type Mutation {
    publishArticle(input: PublishArticleInput!): Draft! @authenticate
    archiveArticle(input: ArchiveArticleInput!): Article! @authenticate
    subscribeArticle(input: SubscribeArticleInput!): Boolean @authenticate
    unsubscribeArticle(input: UnsubscribeArticleInput!): Boolean @authenticate
    reportArticle(input: ReportArticleInput!): Boolean
    appreciateArticle(input: AppreciateArticleInput!): Article! @authenticate
    readArticle(input: ReadArticleInput!): Boolean
    recallPublish(input: RecallPublishInput!): Draft! @authenticate
    # OSS
    toggleArticleLive(input: ToggleArticleLiveInput!): Article!
    toggleArticlePublic(input: ToggleArticlePublicInput!): Article!
  }

  type Article implements Node {
    id: ID!
    topicScore: Int
    slug: String!
    createdAt: DateTime!
    state: ArticleState!
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
    upstream: Article
    downstreams(input: ConnectionArgs!): ArticleConnection!
    relatedArticles(input: ConnectionArgs!): ArticleConnection!
    # MAT recieved for this article
    MAT: Int!
    participantCount: Int! @deprecated(reason: "not used")
    participants: UserConnection! @deprecated(reason: "not used")
    subscribers(input: ConnectionArgs!): UserConnection!
    appreciators(input: ConnectionArgs!): UserConnection!
    appreciatorCount: Int! @deprecated(reason: "Use \`appreciators.totalCount\`.")
    # limit the nuhmber of appreciate per user
    appreciateLimit: Int!
    appreciateLeft: Int!
    # Viewer has appreciate
    hasAppreciate: Boolean!
    # Viewer has subscribed
    subscribed: Boolean!
    # OSS
    oss: ArticleOSS! @authorize
    remark: String @authorize
  }

  type Tag implements Node {
    id: ID!
    content: String!
    count: Int! @deprecated(reason: "Use \`articles.totalCount\`.")
    articles(input: ConnectionArgs!): ArticleConnection!
    createdAt: DateTime!
    # OSS
    oss: TagOSS! @authorize
    remark: String @authorize
  }

  type  ArticleOSS @authorize {
    boost: NonNegativeFloat!
    score: NonNegativeFloat!
    inRecommendToday: Boolean!
    inRecommendIcymi: Boolean!
    inRecommendHottest: Boolean!
    inRecommendNewset: Boolean!
    inRecommendTopic: Boolean!
  }

  type TagOSS @authorize {
    boost: NonNegativeFloat!
    score: NonNegativeFloat!
  }

  type ArticleConnection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ArticleEdge!]
  }

  type ArticleEdge {
    cursor: String!
    node: Article!
  }

  type TagConnection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [TagEdge!]
  }

  type TagEdge {
    cursor: String!
    node: Tag!
  }

  input ArticleInput {
    mediaHash: String!
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
    category: ID!
    description: String!
    assetIds: [ID!]
    contact: String
  }

  input AppreciateArticleInput {
    id: ID!
    amount: Int!
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

  enum ArticleState {
    active
    archived
    banned
  }
`
