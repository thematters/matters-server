export default /* GraphQL */ `
  extend type Query {
    article(input: ArticleInput!): Article
  }

  extend type Mutation {
    publishArticle(input: PublishArticleInput!): Draft! @authenticate
    archiveArticle(input: ArchiveArticleInput!): Article! @authenticate
    subscribeArticle(input: SubscribeArticleInput!): Article! @authenticate
    unsubscribeArticle(input: UnsubscribeArticleInput!): Article! @authenticate
    reportArticle(input: ReportArticleInput!): Boolean
    appreciateArticle(input: AppreciateArticleInput!): Article! @authenticate
    readArticle(input: ReadArticleInput!): Article!
    recallPublish(input: RecallPublishInput!): Draft! @authenticate
    # OSS
    toggleArticleLive(input: ToggleArticleLiveInput!): Article! @authorize
    toggleArticlePublic(input: ToggleArticlePublicInput!): Article! @authorize
    toggleArticleRecommend(input: ToggleArticleRecommendInput!): Article! @authorize
    updateArticleState(input: UpdateArticleStateInput!): Article! @authorize
    deleteTags(input: DeleteTagsInput!): Boolean @authorize
    renameTag(input: RenameTagInput!): Tag! @authorize
    mergeTags(input: MergeTagsInput!): Tag! @authorize
    updateMattersToday(input: UpdateMattersTodayInput!): Article! @authorize
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
    collectedBy(input: ConnectionArgs!): ArticleConnection!
    collection(input: ConnectionArgs!): ArticleConnection!
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
    oss: ArticleOSS!
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

  type  ArticleOSS {
    boost: NonNegativeFloat! @authorize
    score: NonNegativeFloat! @authorize
    inRecommendToday: Boolean! @authorize
    inRecommendIcymi: Boolean! @authorize
    inRecommendHottest: Boolean! @authorize
    inRecommendNewest: Boolean! @authorize
    todayCover: String
    todayTitle: String
    todaySummary: String
  }

  type TagOSS {
    boost: NonNegativeFloat!
    score: NonNegativeFloat!
  }

  type ArticleConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ArticleEdge!]
  }

  type ArticleEdge {
    cursor: String!
    node: Article!
  }

  type TagConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [TagEdge!]
  }

  type TagEdge {
    cursor: String!
    node: Tag!
  }

  input ArticleInput {
    mediaHash: String
    uuid: UUID
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

  input UpdateArticleStateInput {
    id: ID!
    state: ArticleState!
  }

  input DeleteTagsInput {
    ids: [ID!]!
  }

  input RenameTagInput {
    id: ID!
    content: String!
  }

  input MergeTagsInput {
    ids: [ID!]!
    content: String!
  }

  input UpdateMattersTodayInput {
    id: ID!
    cover: String
    title: String
    summary: String
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
