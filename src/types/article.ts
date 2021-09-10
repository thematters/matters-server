import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    article(input: ArticleInput!): Article @privateCache @logCache(type: "${NODE_TYPES.Article}")
  }

  extend type Mutation {
    ##############
    #   Article  #
    ##############
    "Publish an article onto IPFS."
    publishArticle(input: PublishArticleInput!): Draft! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}") @purgeCache(type: "${NODE_TYPES.Draft}") @rateLimit(limit:10, period:7200)

    "Edit an article."
    editArticle(input: EditArticleInput!): Article! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.Article}")

    "Subscribe or Unsubscribe article"
    toggleSubscribeArticle(input: ToggleItemInput!): Article! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Article}")

    "Appreciate an article."
    appreciateArticle(input: AppreciateArticleInput!): Article! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.Article}") @rateLimit(limit:5, period:60)

    "Read an article."
    readArticle(input: ReadArticleInput!): Article!

    ######################
    # Article Containers #
    ######################
    "Create a Topic when no id is given, update fields when id is given. Throw error if no id & no title."
    putTopic(input: PutTopicInput!): Topic!

    "Create a Chapter when no id is given, update fields when id is given. Throw error if no id & no title, or no id & no topic."
    putChapter(input: PutChapterInput!): Chapter!


    ##############
    #     Tag    #
    ##############
    "Follow or unfollow tag."
    toggleFollowTag(input: ToggleItemInput!): Tag! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Tag}")

    "Create or update tag."
    putTag(input: PutTagInput!): Tag! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Tag}")

    "Update member, permission and othters of a tag."
    updateTagSetting(input: UpdateTagSettingInput!): Tag! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Tag}")

    "Add one tag to articles."
    addArticlesTags(input: AddArticlesTagsInput!): Tag! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Tag}")

    "Update articles' tag."
    updateArticlesTags(input: UpdateArticlesTagsInput!): Tag! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Tag}")

    "Delete one tag from articles"
    deleteArticlesTags(input: DeleteArticlesTagsInput!): Tag! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Tag}")


    ##############
    #     OSS    #
    ##############
    toggleArticleRecommend(input: ToggleRecommendInput!): Article! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Article}")
    updateArticleState(input: UpdateArticleStateInput!): Article! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Article}")

    toggleTagRecommend(input: ToggleRecommendInput!): Tag! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Tag}")
    deleteTags(input: DeleteTagsInput!): Boolean @auth(mode: "${AUTH_MODE.admin}")
    renameTag(input: RenameTagInput!): Tag! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Tag}")
    mergeTags(input: MergeTagsInput!): Tag! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Tag}")
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

    "Time of this article was revised."
    revisedAt: DateTime

    "State of this article."
    state: ArticleState!

    "Author of this article."
    author: User! @logCache(type: "${NODE_TYPES.User}")

    "Article title."
    title: String!

    "Article cover's link."
    cover: String

    "List of assets are belonged to this article."
    assets: [Asset!]! @cacheControl(maxAge: ${CACHE_TTL.INSTANT})

    "A short summary for this article."
    summary: String!

    "This value determines if the summary is customized or not."
    summaryCustomized: Boolean!

    "Tags attached to this article."
    tags: [Tag!] @logCache(type: "${NODE_TYPES.Tag}")

    "Word count of this article."
    wordCount: Int

    "IPFS hash of this article."
    dataHash: String!

    "Media hash, composed of cid encoding, of this article."
    mediaHash: String!

    "Content of this article."
    content: String!

    "Original language of content"
    language: String

    "List of articles which added this article into their collections."
    collectedBy(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "List of articles added into this article' collection."
    collection(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Related articles to this article."
    relatedArticles(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Donation-related articles to this article."
    relatedDonationArticles(input: RelatedDonationArticlesInput!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Appreciations history of this article."
    appreciationsReceived(input: ConnectionArgs!): AppreciationConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Total number of appreciations recieved of this article."
    appreciationsReceivedTotal: Int!

    "Subscribers of this article."
    subscribers(input: ConnectionArgs!): UserConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

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
    transactionsReceivedBy(input: TransactionsReceivedByArgs!): UserConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Cumulative reading time in seconds"
    readTime: Float!

    "Drafts linked to this article."
    drafts: [Draft!] @logCache(type: "${NODE_TYPES.Draft}")

    "Revision Count"
    revisionCount: Int!

    "Access related fields on circle"
    access: ArticleAccess!

    "License Type"
    license: ArticleLicenseType!


    ##############
    #     OSS    #
    ##############
    oss: ArticleOSS! @auth(mode: "${AUTH_MODE.admin}")
    remark: String @auth(mode: "${AUTH_MODE.admin}")
  }

  "This type contains metadata, content and related data of Chapter type, which is a container for Article type. A Chapter belong to a Topic."
  type Chapter implements Node {
    "Unique id of this chapter."
    id: ID!

    "Title of this chapter."
    title: String!

    "Description of this chapter."
    description: String

    "Articles included in this Chapter"
    articles: [Article]!

    "The topic that this Chapter belongs to."
    topic: Topic!
  }


  "This type contains metadata, content and related data of a topic, which is a container for Article and Chapter types."
  type Topic implements Node {
    "Unique id of this topic."
    id: ID!

    "Title of this topic."
    title: String!

    "Cover of this topic."
    cover: String

    "Description of this topic."
    description: String

    "Number of chapters included in this topic."
    chapterCount: Int!

    "Number articles included in this topic."
    articleCount: Int!

    "List of chapters included in this topic."
    chapters: [Chapter]!

    "List of articles included in this topic."
    articles: [Article]!

    "Author of this topic."
    author: User!

    "Whether this topic is public or not."
    public: Boolean!
  }

  "This type contains content, count and related data of an article tag."
  type Tag implements Node {
    "Unique id of this tag."
    id: ID!

    "Content of this tag."
    content: String!

    "List of how many articles were attached with this tag."
    articles(input: TagArticlesInput!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "This value determines if this article is selected by this tag or not."
    selected(input: TagSelectedInput!): Boolean!

    "Time of this tag was created."
    createdAt: DateTime!

    "Tag's cover link."
    cover: String

    "Description of this tag."
    description: String

    "Editors of this tag."
    editors(input: TagEditorsInput): [User!] @logCache(type: "${NODE_TYPES.User}")

    "Creator of this tag."
    creator: User @logCache(type: "${NODE_TYPES.User}")

    "Owner of this tag."
    owner: User

    "This value determines if current viewer is following or not."
    isFollower: Boolean

    "Followers of this tag."
    followers(input: ConnectionArgs!): UserConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Participants of this tag."
    participants(input: ConnectionArgs!): UserConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "This value determines if it is official."
    isOfficial: Boolean

    ##############
    #     OSS    #
    ##############
    oss: TagOSS! @auth(mode: "${AUTH_MODE.admin}")
    remark: String @auth(mode: "${AUTH_MODE.admin}")
    deleted: Boolean! @auth(mode: "${AUTH_MODE.admin}")
  }

  type ArticleAccess {
    type: ArticleAccessType!
    secret: String
    circle: Circle @logCache(type: "${NODE_TYPES.Circle}")
  }

  type ArticleOSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    boost: Float! @auth(mode: "${AUTH_MODE.admin}")
    score: Float! @auth(mode: "${AUTH_MODE.admin}")
    inRecommendIcymi: Boolean! @auth(mode: "${AUTH_MODE.admin}")
    inRecommendHottest: Boolean! @auth(mode: "${AUTH_MODE.admin}")
    inRecommendNewest: Boolean! @auth(mode: "${AUTH_MODE.admin}")
  }

  type ArticleTranslation {
    title: String
    content: String
  }

  type TagOSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    boost: Float!
    score: Float!
    selected: Boolean!
  }

  type ArticleConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ArticleEdge!]
  }

  type ArticleEdge {
    cursor: String!
    node: Article! @logCache(type: "${NODE_TYPES.Article}")
  }

  type TagConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [TagEdge!]
  }

  type TagEdge {
    cursor: String!
    node: Tag! @logCache(type: "${NODE_TYPES.Tag}")
  }

  input ArticleInput {
    mediaHash: String!
  }

  input PublishArticleInput {
    id: ID!
  }

  input EditArticleInput {
    id: ID!
    state: ArticleState
    sticky: Boolean
    summary: String
    tags: [String!]
    content: String
    cover: ID
    collection: [ID!]
    circle: ID
    accessType: ArticleAccessType

    "License Type, \`ARR\` is only for paywalled article"
    license: ArticleLicenseType
  }

  input AppreciateArticleInput {
    id: ID!
    amount: Int! @constraint(min: 1)
    token: String
    superLike: Boolean
  }

  input ReadArticleInput {
    id: ID!
  }

  input PutTopicInput {
    id: ID
    title: String
    description: String
    cover: ID
    public: Boolean
    articles: [ID!]
    chapters: [ID!]
  }

  input PutChapterInput {
    id: ID
    title: String
    description: String
    topic: ID
    articles: [ID!]
  }

  input ToggleRecommendInput {
    id: ID!
    enabled: Boolean!
    type: RecommendTypes
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

  input UpdateTagSettingInput {
    id: ID!
    type: UpdateTagSettingType!
    editors: [ID!]
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
    first: Int @constraint(min: 0)
    oss: Boolean
    selected: Boolean
  }

  input TagSelectedInput {
    id: ID
    mediaHash: String
  }

  input TagEditorsInput {
    excludeAdmin: Boolean
    excludeOwner: Boolean
  }

  input TransactionsReceivedByArgs {
    after: String
    first: Int @constraint(min: 0)
    purpose: TransactionPurpose!
  }

  input TranslationArgs {
    language: UserLanguage!
  }

  input RelatedDonationArticlesInput {
    after: String
    first: Int @constraint(min: 0)
    oss: Boolean

    "index of article list, min: 0, max: 49"
    random: Int @constraint(min: 0, max: 49)
  }

  "Enums for an article state."
  enum ArticleState {
    active
    archived
    banned
  }

  "Enums for types of article access"
  enum ArticleAccessType {
    public
    paywall
  }

  "Enums for types of article license"
  enum ArticleLicenseType {
    cc_0 # CC0
    cc_by_nc_nd_2 # CC BY-NC-ND 2.0
    arr # All Right Reserved
  }

  "Enums for types of recommend articles."
  enum RecommendTypes {
    icymi
    hottest
    newest
  }

  enum UpdateTagSettingType {
    adopt
    leave
    add_editor
    remove_editor
    leave_editor
  }
`
