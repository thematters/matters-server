import { CACHE_TTL, NODE_TYPES } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    article(input: ArticleInput!): Article @privateCache @logCache(type: "${NODE_TYPES.article}")
  }

  extend type Mutation {
    "Publish an article onto IPFS."
    publishArticle(input: PublishArticleInput!): Draft! @authenticate @purgeCache @rateLimit(limit:10, period:7200)

    "Archive an article and users won't be able to view this article."
    archiveArticle(input: ArchiveArticleInput!): Article! @authenticate @purgeCache

    "Report an article to team."
    reportArticle(input: ReportArticleInput!): Boolean

    "Subscribe or Unsubscribe article"
    toggleSubscribeArticle(input: ToggleItemInput!): Article! @authenticate @purgeCache

    "Appreciate an article."
    appreciateArticle(input: AppreciateArticleInput!): Article! @authenticate @purgeCache @rateLimit(limit:5, period:60)

    "Read an article."
    readArticle(input: ReadArticleInput!): Article!

    "Recall while publishing."
    recallPublish(input: RecallPublishInput!): Draft! @authenticate @purgeCache

    "Set collection of an article."
    setCollection(input: SetCollectionInput!): Article! @authenticate @purgeCache

    "Update article information."
    updateArticleInfo(input: UpdateArticleInfoInput!): Article! @authenticate @purgeCache

    "Create or update tag."
    putTag(input: PutTagInput!): Tag! @authorize @purgeCache

    "Add or update one tag to articles."
    putArticlesTags(input: PutArticlesTagsInput!): Tag! @authorize @purgeCache

    "Delete one tag from articles"
    deleteArticlesTags(input: UpdateArticlesTagsInput!): Tag! @authorize @purgeCache

    ##############
    #     OSS    #
    ##############
    toggleArticleLive(input: ToggleItemInput!): Article! @authorize @purgeCache
    toggleArticlePublic(input: ToggleItemInput!): Article! @authorize @purgeCache
    toggleArticleRecommend(input: ToggleArticleRecommendInput!): Article! @purgeCache
      @authorize
    updateArticleState(input: UpdateArticleStateInput!): Article! @authorize @purgeCache
    deleteTags(input: DeleteTagsInput!): Boolean @authorize @purgeCache
    renameTag(input: RenameTagInput!): Tag! @authorize @purgeCache
    mergeTags(input: MergeTagsInput!): Tag! @authorize @purgeCache


    ##############
    # DEPRECATED #
    ##############
    "Subscribe an artcile."
    subscribeArticle(input: SubscribeArticleInput!): Article! @authenticate @purgeCache @deprecated(reason: "Use \`toggleSubscribeArticle\`.")

    "Unsubscribe an article."
    unsubscribeArticle(input: UnsubscribeArticleInput!): Article! @authenticate @purgeCache
    @deprecated(reason: "Use \`toggleSubscribeArticle\`.")
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

    "Appreciations history of this article."
    appreciationsReceived(input: ConnectionArgs!): AppreciationConnection!

    "Total number of appreciations recieved of this article."
    appreciationsReceivedTotal: Int!

    "Subscribers of this articles."
    subscribers(input: ConnectionArgs!): UserConnection!

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

    "Translation of article title and content."
    translation: ArticleTranslation

    # OSS
    oss: ArticleOSS! @authorize
    remark: String @authorize
  }

  "This type contains content, count and related data of an article tag."
  type Tag implements Node {
    "Unique id of this tag."
    id: ID!

    "Content of this tag."
    content: String!

    "List of how many articles were attached with this tag."
    articles(input: TagArticlesInput!): ArticleConnection!

    "This value determines if this article is selected by this tag or not."
    selected(input: TagSelectedInput!): Boolean!

    "Time of this tag was created."
    createdAt: DateTime!

    "Tag's cover link."
    cover: URL

    "Description of this tag."
    description: String

    "Editors of this tag."
    editors: [User!]

    # OSS
    oss: TagOSS! @authorize
    remark: String @authorize
    deleted: Boolean! @authorize
  }

  type ArticleOSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    boost: NonNegativeFloat! @authorize
    score: NonNegativeFloat! @authorize
    inRecommendIcymi: Boolean! @authorize
    inRecommendHottest: Boolean! @authorize
    inRecommendNewest: Boolean! @authorize
  }

  type ArticleTranslation @objectCache(maxAge: ${CACHE_TTL.STATIC}) {
    originalLanguage: String!
    title: String!
    content: String!
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
    node: Article! @logCache(type: "${NODE_TYPES.article}")
  }

  type TagConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [TagEdge!]
  }

  type TagEdge {
    cursor: String!
    node: Tag! @logCache(type: "${NODE_TYPES.tag}")
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

  input PutTagInput {
    id: ID
    content: String
    description: String
  }

  input PutArticlesTagsInput {
    id: ID!
    articles: [ID!]
    selected: Boolean
  }

  input UpdateArticlesTagsInput {
    id: ID!
    articles: [ID!]
  }

  input TagArticlesInput {
    after: String
    first: Int
    oss: Boolean
    selected: Boolean
  }

  input TagSelectedInput {
    id: ID
    mediaHash: String
  }

  "Enums for an article state."
  enum ArticleState {
    active
    archived
    banned
  }

  "Enums for types of recommend articles."
  enum RecommendTypes {
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
