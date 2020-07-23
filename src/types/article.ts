import { CACHE_TTL, NODE_TYPES } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    article(input: ArticleInput!): Article @privateCache @logCache(type: "${NODE_TYPES.article}")
  }

  extend type Mutation {
    ##############
    #   Article  #
    ##############
    "Publish an article onto IPFS."
    publishArticle(input: PublishArticleInput!): Draft! @authenticate @purgeCache(type: "${NODE_TYPES.draft}") @rateLimit(limit:10, period:7200)

    "Edit an article."
    editArticle(input: EditArticleInput!): Article! @authenticate @purgeCache(type: "${NODE_TYPES.article}")

    "Report an article to team."
    reportArticle(input: ReportArticleInput!): Boolean

    "Subscribe or Unsubscribe article"
    toggleSubscribeArticle(input: ToggleItemInput!): Article! @authenticate @purgeCache(type: "${NODE_TYPES.article}")

    "Appreciate an article."
    appreciateArticle(input: AppreciateArticleInput!): Article! @authenticate @purgeCache(type: "${NODE_TYPES.article}") @rateLimit(limit:5, period:60)

    "Read an article."
    readArticle(input: ReadArticleInput!): Article!


    ##############
    #     Tag    #
    ##############
    "Create or update tag."
    putTag(input: PutTagInput!): Tag! @authenticate @purgeCache(type: "${NODE_TYPES.tag}")

    "Add one tag to articles."
    addArticlesTags(input: AddArticlesTagsInput!): Tag! @authenticate @purgeCache(type: "${NODE_TYPES.tag}")

    "Update articles' tag."
    updateArticlesTags(input: UpdateArticlesTagsInput!): Tag! @authenticate @purgeCache(type: "${NODE_TYPES.tag}")

    "Delete one tag from articles"
    deleteArticlesTags(input: DeleteArticlesTagsInput!): Tag! @authenticate @purgeCache(type: "${NODE_TYPES.tag}")


    ##############
    #     OSS    #
    ##############
    toggleArticleLive(input: ToggleItemInput!): Article! @authorize @logCache(type: "${NODE_TYPES.article}")
    toggleArticlePublic(input: ToggleItemInput!): Article! @authorize @logCache(type: "${NODE_TYPES.article}")
    toggleArticleRecommend(input: ToggleArticleRecommendInput!): Article! @logCache(type: "${NODE_TYPES.article}")
      @authorize
    updateArticleState(input: UpdateArticleStateInput!): Article! @authorize @logCache(type: "${NODE_TYPES.article}")
    deleteTags(input: DeleteTagsInput!): Boolean @authorize
    renameTag(input: RenameTagInput!): Tag! @authorize @logCache(type: "${NODE_TYPES.tag}")
    mergeTags(input: MergeTagsInput!): Tag! @authorize @logCache(type: "${NODE_TYPES.tag}")


    ##############
    # DEPRECATED #
    ##############
    "Subscribe an artcile."
    subscribeArticle(input: SubscribeArticleInput!): Article! @authenticate @logCache(type: "${NODE_TYPES.article}") @deprecated(reason: "Use \`toggleSubscribeArticle\`.")

    "Unsubscribe an article."
    unsubscribeArticle(input: UnsubscribeArticleInput!): Article! @authenticate @logCache(type: "${NODE_TYPES.article}")
    @deprecated(reason: "Use \`toggleSubscribeArticle\`.")

    "Archive an article and users won't be able to view this article."
    archiveArticle(input: ArchiveArticleInput!): Article! @authenticate @logCache(type: "${NODE_TYPES.article}") @deprecated(reason: "Use \`editArticle\`.")

    "Set collection of an article."
    setCollection(input: SetCollectionInput!): Article! @authenticate @logCache(type: "${NODE_TYPES.article}") @deprecated(reason: "Use \`editArticle\`.")

    "Update article information."
    updateArticleInfo(input: UpdateArticleInfoInput!): Article! @authenticate @logCache(type: "${NODE_TYPES.article}") @deprecated(reason: "Use \`editArticle\`.")

    "Recall while publishing."
    recallPublish(input: RecallPublishInput!): Draft! @authenticate @logCache(type: "${NODE_TYPES.draft}") @deprecated
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

    "Original language of content"
    language: String @objectCache(maxAge: ${CACHE_TTL.SHORT})

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

    "This value determines if current viewer can SuperLike or not."
    canSuperLike: Boolean!

    "This value determines if current Viewer has subscribed of not."
    subscribed: Boolean!

    "This value determines if this article is an author selected article or not."
    sticky: Boolean!

    "Translation of article title and content."
    translation(input: TranslationArgs): ArticleTranslation @objectCache(maxAge: ${CACHE_TTL.STATIC})

    "Transactions history of this article."
    transactionsReceivedBy(input: TransactionsReceivedByArgs!): UserConnection!

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

    "Creator of this tag."
    creator: User

    "This value determines if current viewer is following or not."
    isFollower: Boolean

    "Followers of this tag."
    followers(input: ConnectionArgs!): UserConnection!

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

  type ArticleTranslation {
    originalLanguage: String! @deprecated(reason: "Use \`Article.language\` instead")
    title: String
    content: String
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

  input EditArticleInput {
    id: ID!
    state: ArticleState
    sticky: Boolean
    tags: [String!]
    collection: [ID!]
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
    token: String
    superLike: Boolean
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
    cover: ID
    description: String
  }

  input AddArticlesTagsInput {
    id: ID!
    articles: [ID!]
    selected: Boolean
  }

  input UpdateArticlesTagsInput {
    id: ID!
    articles: [ID!]
    isSelected: Boolean!
  }

  input DeleteArticlesTagsInput {
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

  input TransactionsReceivedByArgs {
    after: String
    first: Int
    purpose: TransactionPurpose!
  }

  input TranslationArgs {
    language: UserLanguage!
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
