import { CACHE_TTL } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    article(input: ArticleInput!): Article
  }

  extend type Mutation {
    "Publish an article onto IPFS."
    publishArticle(input: PublishArticleInput!): Draft! @authenticate

    "Archive an article and users won't be able to view this article."
    archiveArticle(input: ArchiveArticleInput!): Article! @authenticate

    "Subscribe an artcile."
    subscribeArticle(input: SubscribeArticleInput!): Article! @authenticate

    "Unsubscribe an article."
    unsubscribeArticle(input: UnsubscribeArticleInput!): Article! @authenticate

    "Report an article to team."
    reportArticle(input: ReportArticleInput!): Boolean

    "Appreciate an article."
    appreciateArticle(input: AppreciateArticleInput!): Article! @authenticate

    "Read an article."
    readArticle(input: ReadArticleInput!): Article!

    "Recall while publishing."
    recallPublish(input: RecallPublishInput!): Draft! @authenticate

    "Set collection of an article."
    setCollection(input: SetCollectionInput!): Article! @authenticate

    "Update article information."
    updateArticleInfo(input: UpdateArticleInfoInput!): Article! @authenticate

    # OSS
    toggleArticleLive(input: ToggleArticleLiveInput!): Article! @authorize
    toggleArticlePublic(input: ToggleArticlePublicInput!): Article! @authorize
    toggleArticleRecommend(input: ToggleArticleRecommendInput!): Article!
      @authorize
    updateArticleState(input: UpdateArticleStateInput!): Article! @authorize
    deleteTags(input: DeleteTagsInput!): Boolean @authorize
    renameTag(input: RenameTagInput!): Tag! @authorize
    mergeTags(input: MergeTagsInput!): Tag! @authorize
    updateMattersToday(input: UpdateMattersTodayInput!): Article! @authorize
  }

  """
  This type contains metadata, content, hash and related data of an article. If you
  want information about article's comments. Please check Comment type.
  """
  type Article implements Node {
    "Unique ID of this article"
    id: ID!

    "The number represents how popular is this article."
    topicScore: Int

    "Slugified article title."
    slug: String!

    "Time of this article was created."
    createdAt: DateTime!

    "State of this article."
    state: ArticleState!

    "This value determines if this article is accessible to visitors."
    public: Boolean!

    "This value determines if this article is under Subscription or not."
    live: Boolean!

    "Author of this article."
    author: User!

    "Article title."
    title: String!

    "Article cover's link."
    cover: URL

    "A short summary for this article."
    summary: String!

    "Tags attached to this article."
    tags: [Tag!]

    "Word count of this article."
    wordCount: Int

    "IPFS hash of this article."
    dataHash: String

    "Media hash, composed of cid encoding, of this article."
    mediaHash: String

    "Content of this article."
    content: String!

    "List of articles which added this article into their collections."
    collectedBy(input: ConnectionArgs!): ArticleConnection!

    "List of articles added into this articles' collection."
    collection(input: ConnectionArgs!): ArticleConnection!

    "Related articles to this articles."
    relatedArticles(input: ConnectionArgs!): ArticleConnection!

    "MAT recieved for this article "
    MAT: Int!
    participantCount: Int! @deprecated(reason: "not used")
    participants: UserConnection! @deprecated(reason: "not used")

    "Subscribers of this articles."
    subscribers(input: ConnectionArgs!): UserConnection!

    "Appreciators of this articles."
    appreciators(input: ConnectionArgs!): UserConnection!

    "Total count of this article's appreciations."
    appreciatorCount: Int!
      @deprecated(reason: "Use \`appreciators.totalCount\`.")

    "Limit the nuhmber of appreciate per user."
    appreciateLimit: Int!

    "Number represents how many times per user can appreciate this article."
    appreciateLeft: Int!

    "This value determines if current viewer has appreciated or not."
    hasAppreciate: Boolean!

    "This value determines if current Viewer has subscribed of not."
    subscribed: Boolean!

    "This value determines if this article is an author selected article or not."
    sticky: Boolean!

    # OSS
    oss: ArticleOSS!
    remark: String @authorize
  }

  "This type contains content, count and related data of an article tag."
  type Tag implements Node {
    "Unique id of this tag."
    id: ID!

    "Content of this tag."
    content: String!
    count: Int! @deprecated(reason: "Use \`articles.totalCount\`.")

    "List of how many articles were attached with this tag."
    articles(input: ConnectionArgs!): ArticleConnection!

    "Time of this tag was created."
    createdAt: DateTime!

    # OSS
    oss: TagOSS! @authorize
    remark: String @authorize
  }

  type ArticleOSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
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

  type TagOSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
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

  input TagsInput {
    after: String
    first: Int
    sort: TagsSort
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

  input SetCollectionInput {
    id: ID!
    collection: [ID!]!
  }

  input UpdateArticleInfoInput {
    id: ID!
    sticky: Boolean
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

  "Enums for an article state."
  enum ArticleState {
    active
    archived
    banned
  }

  "Enums for types of recommend articles."
  enum RecommendTypes {
    today
    icymi
    hottest
    newest
  }

  "Enums for sorting tags."
  enum TagsSort {
    newest
    oldest
    hottest
  }
`
