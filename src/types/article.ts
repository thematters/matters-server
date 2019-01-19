export default /* GraphQL */ `
  extend type Query {
    article(input: ArticleInput!): Article
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
    # OSS
    toggleArticleLive(input: ToggleArticleLiveInput!): Article! @auth(requires: admin)
    toggleArticlePublic(input: ToggleArticlePublicInput!): Article! @auth(requires: admin)
    toggleArticleRecommend(input: ToggleArticleRecommendInput!): Article! @auth(requires: admin)
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
    oss: ArticleOSS! @auth(requires: admin)
    remark: String @auth(requires: admin)
  }

  type Tag implements Node {
    id: ID!
    content: String!
    count: Int! @deprecated(reason: "Use \`articles.totalCount\`.")
    articles(input: ConnectionArgs!): ArticleConnection!
    createdAt: DateTime!
    # OSS
    oss: TagOSS! @auth(requires: admin)
    remark: String @auth(requires: admin)
  }

  type ArticleOSS {
    boost: NonNegativeFloat!
    score: NonNegativeFloat!
    inRecommendToday: Boolean!
    inRecommendIcymi: Boolean!
    inRecommendHottest: Boolean!
    inRecommendNewest: Boolean!
  }

  type TagOSS {
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

  input ToggleArticleRecommendInput {
    id: ID!
    enabled: Boolean!
    type: RecommendTypes!
  }

  enum ArticleState {
    active
    archived
    banned
  }

  enum RecommendTypes {
    today
    icymi
    hottest
    newest
  }
`
