import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'
import { isProd } from 'common/environment'

const PUBLISH_ARTICLE_RATE_LIMIT = isProd ? 10 : 1000

export default /* GraphQL */ `
  extend type Query {
    article(input: ArticleInput!): Article @privateCache @logCache(type: "${NODE_TYPES.Article}")
  }

  extend type Mutation {
    ##############
    #   Article  #
    ##############
    "Publish an article onto IPFS."
    publishArticle(input: PublishArticleInput!): Draft! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}") @purgeCache(type: "${NODE_TYPES.Draft}") @rateLimit(limit:${PUBLISH_ARTICLE_RATE_LIMIT}, period:7200)

    "Edit an article."
    editArticle(input: EditArticleInput!): Article! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.Article}")

    "Subscribe or Unsubscribe article"
    toggleSubscribeArticle(input: ToggleItemInput!): Article! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Article}")

    "Appreciate an article."
    appreciateArticle(input: AppreciateArticleInput!): Article! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.Article}") @rateLimit(limit:5, period:60)

    "Read an article."
    readArticle(input: ReadArticleInput!): Article!


    ##############
    #     Tag    #
    ##############
    "Follow or unfollow tag."
    toggleFollowTag(input: ToggleItemInput!): Tag! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Tag}")

    "pin or unpin tag."
    togglePinTag(input: ToggleItemInput!): Tag! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Tag}")

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
    updateArticleSensitive(input: UpdateArticleSensitiveInput!): Article! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Article}")

    toggleTagRecommend(input: ToggleRecommendInput!): Tag! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Tag}")
    deleteTags(input: DeleteTagsInput!): Boolean @complexity(value: 10, multipliers: ["input.ids"]) @auth(mode: "${AUTH_MODE.admin}")
    renameTag(input: RenameTagInput!): Tag! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Tag}")
    mergeTags(input: MergeTagsInput!): Tag! @complexity(value: 10, multipliers: ["input.ids"]) @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.Tag}")
  }

  """
  This type contains metadata, content, hash and related data of an article. If you
  want information about article's comments. Please check Comment type.
  """
  type Article implements Node & PinnableWork {
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

    "List of assets are belonged to this article (Only the author can access currently)."
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

    "Short hash for shorter url addressing"
    shortHash: String! ## add non-null after all rows filled

    "Content (HTML) of this article."
    content: String!

    "Different foramts of content."
    contents: ArticleContents!

    "Original language of content"
    language: String

    "List of articles which added this article into their collections."
    collectedBy(input: ConnectionArgs!): ArticleConnection! @complexity(multipliers: ["input.first"], value: 1)

    "List of articles added into this article' collection."
    collection(input: ConnectionArgs!): ArticleConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Related articles to this article."
    relatedArticles(input: ConnectionArgs!): ArticleConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Donation-related articles to this article."
    relatedDonationArticles(input: RelatedDonationArticlesInput!): ArticleConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Appreciations history of this article."
    appreciationsReceived(input: ConnectionArgs!): AppreciationConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Total number of appreciations recieved of this article."
    appreciationsReceivedTotal: Int!

    "Total number of donation recieved of this article."
    donationCount: Int! @cacheControl(maxAge: ${CACHE_TTL.SHORT})

    "Total number of readers of this article."
    readerCount: Int! @cacheControl(maxAge: ${CACHE_TTL.SHORT})

    "Subscribers of this article."
    subscribers(input: ConnectionArgs!): UserConnection! @complexity(multipliers: ["input.first"], value: 1)

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
    sticky: Boolean! @deprecated(reason: "Use pinned instead")
    pinned: Boolean!

    "Translation of article title and content."
    translation(input: TranslationArgs): ArticleTranslation

    "Available translation languages."
    availableTranslations: [UserLanguage!]

    "Transactions history of this article."
    transactionsReceivedBy(input: TransactionsReceivedByArgs!): UserConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Donations of this article, grouped by sender"
    donations(input: ConnectionArgs!): ArticleDonationConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Cumulative reading time in seconds"
    readTime: Float!

    "Drafts linked to this article."
    drafts: [Draft!] @logCache(type: "${NODE_TYPES.Draft}") @deprecated(reason: "Use Article.newestUnpublishedDraft or Article.newestPublishedDraft instead")

    "Newest unpublished draft linked to this article."
    newestUnpublishedDraft: Draft @logCache(type: "${NODE_TYPES.Draft}")

    "Newest published draft linked to this article."
    newestPublishedDraft: Draft! @logCache(type: "${NODE_TYPES.Draft}")

    "Revision Count"
    revisionCount: Int!

    "Access related fields on circle"
    access: ArticleAccess!

    "whether content is marked as sensitive by author"
    sensitiveByAuthor: Boolean!

    "whether content is marked as sensitive by admin"
    sensitiveByAdmin: Boolean!

    "License Type"
    license: ArticleLicenseType!

    "creator message asking for support"
    requestForDonation: String

    "creator message after support"
    replyToDonator: String

    "the iscnId if published to ISCN"
    iscnId: String

    "whether readers can comment"
    canComment: Boolean!

    "history versions"
    versions(input: ArticleVersionsInput!): ArticleVersionsConnection! @complexity(multipliers: ["input.first"], value: 1)

    ##############
    #     OSS    #
    ##############
    oss: ArticleOSS! @auth(mode: "${AUTH_MODE.admin}")
    remark: String @auth(mode: "${AUTH_MODE.admin}")
  }

  input ArticleVersionsInput {
    after: String
    first: Int @constraint(min: 0)
  }

  type ArticleVersionsConnection implements Connection {
     totalCount: Int!
     pageInfo: PageInfo!
     edges: [ArticleVersionEdge]!
  }

  type ArticleVersionEdge {
     node: ArticleVersion!
     cursor: String!
  }

  type ArticleVersion implements Node {
    id: ID!
    dataHash: String
    mediaHash: String
    title: String!
    summary: String!
    contents: ArticleContents!
    translation(input: TranslationArgs): ArticleTranslation
    createdAt: DateTime!
    description: String
  }


  "This type contains content, count and related data of an article tag."
  type Tag implements Node {
    "Unique id of this tag."
    id: ID!

    "Content of this tag."
    content: String!

    "List of how many articles were attached with this tag."
    articles(input: TagArticlesInput!): ArticleConnection! @complexity(multipliers: ["input.first"], value: 1)

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

    "This value determines if the tag is pinned by current viewer."
    isPinned: Boolean

    "Followers of this tag."
    followers(input: ConnectionArgs!): UserConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Participants of this tag."
    participants(input: ConnectionArgs!): UserConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Tags recommended based on relations to current tag."
    recommended(input: ConnectionArgs!): TagConnection! @complexity(multipliers: ["input.first"], value: 1)

    "This value determines if it is official."
    isOfficial: Boolean

    "Counts of this tag."
    numArticles: Int! @objectCache(maxAge: ${CACHE_TTL.MEDIUM}) ## cache for 1 hour
    numAuthors: Int! @objectCache(maxAge: ${CACHE_TTL.MEDIUM})  ## cache for 1 hour
    ## numArticlesR3m: Int
    ## numAuthorsR3m: Int


    ##############
    #     OSS    #
    ##############
    oss: TagOSS! @auth(mode: "${AUTH_MODE.admin}")
    remark: String @auth(mode: "${AUTH_MODE.admin}")
    deleted: Boolean! @auth(mode: "${AUTH_MODE.admin}")
  }

  type ArticleContents {
    "Markdown content of this article."
    markdown: String!

    "HTML content of this article."
    html: String!
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
    summary: String
    language: String
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

  type ArticleDonationConnection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ArticleDonationEdge!]
  }

  type ArticleDonationEdge {
    cursor: String!
    node: ArticleDonation!
  }

  type ArticleDonation {
    id: ID!
    sender: User
  }

  input ArticleInput {
    mediaHash: String
    shortHash: String
  }

  input PublishArticleInput {
    id: ID!

    "whether publish to ISCN"
    iscnPublish: Boolean
  }

  input EditArticleInput {
    id: ID!
    state: ArticleState
    "deprecated, use pinned instead"
    sticky: Boolean
    pinned: Boolean
    title: String
    summary: String
    tags: [String!]
    content: String
    cover: ID
    collection: [ID!]
    circle: ID
    accessType: ArticleAccessType
    sensitive: Boolean
    license: ArticleLicenseType

    requestForDonation: String  @constraint(maxLength: 140)
    replyToDonator: String  @constraint(maxLength: 140)

    "revision description"
    description: String @constraint(maxLength: 140)

    "whether publish to ISCN"
    iscnPublish: Boolean

    "whether readers can comment"
    canComment: Boolean
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

  input ToggleRecommendInput {
    id: ID!
    enabled: Boolean!
    type: RecommendTypes
  }

  input UpdateArticleStateInput {
    id: ID!
    state: ArticleState!
  }

  input UpdateArticleSensitiveInput {
    id: ID!
    sensitive: Boolean!
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

  enum TagArticlesSortBy {
    byHottestDesc
    byCreatedAtDesc
  }

  input TagArticlesInput {
    after: String
    first: Int @constraint(min: 0)
    oss: Boolean
    selected: Boolean
    sortBy: TagArticlesSortBy = byCreatedAtDesc
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
    senderId: ID
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
    cc_by_nc_nd_2 # CC BY-NC-ND 2.0, no longer in use
    cc_by_nc_nd_4 # CC BY-NC-ND 4.0
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
