import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    viewer: User @privateCache @logCache(type: "${NODE_TYPES.User}")
    user(input: UserInput!): User @privateCache @logCache(type: "${NODE_TYPES.User}")
  }

  extend type Mutation {
    "Send verification code for email."
    sendVerificationCode(input: SendVerificationCodeInput!): Boolean

    "Confirm verification code from email."
    confirmVerificationCode(input: ConfirmVerificationCodeInput!): ID!

    "Reset user or payment password."
    resetPassword(input: ResetPasswordInput!): Boolean

    "Change user email."
    changeEmail(input: ChangeEmailInput!): User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.User}")

    "Register user, can only be used on matters.news website."
    userRegister(input: UserRegisterInput!): AuthResult!

    "Login user."
    userLogin(input: UserLoginInput!): AuthResult!

    "Get signing message."
    generateSigningMessage(input: GenerateSigningMessageInput!): SigningMessageResult!

    "Login/Signup via a wallet."
    walletLogin(input: WalletLoginInput!): AuthResult!

    "Reset crypto wallet."
    resetWallet(input: ResetWalletInput!): User! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.User}")

    "Logout user."
    userLogout: Boolean!

    "Generate or claim a Liker ID through LikeCoin"
    generateLikerId: User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.User}")

    "Reset Liker ID"
    resetLikerId(input: ResetLikerIdInput!): User! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.User}")

    "Update user information."
    updateUserInfo(input: UpdateUserInfoInput!): User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.User}")

    "Update user notification settings."
    updateNotificationSetting(input: UpdateNotificationSettingInput!): User!
      @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.User}")

    "Follow or Unfollow current user."
    toggleFollowUser(input: ToggleItemInput!): User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.User}")

    "Block or Unblock a given user."
    toggleBlockUser(input: ToggleItemInput!): User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.User}")

    "Clear read history for user."
    clearReadHistory(input: ClearReadHistoryInput!): Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")

    "Clear search history for user."
    clearSearchHistory: Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")

    "Migrate articles from other service provider."
    migration(input: MigrationInput!): Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}")

    "Let Traveloggers owner claims a Logbook, returns transaction hash"
    claimLogbooks(input: ClaimLogbooksInput!): ClaimLogbooksResult!

    ##############
    #     OSS    #
    ##############
    "Update state of a user, used in OSS."
    updateUserState(input: UpdateUserStateInput!): [User!] @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.User}")

    "Update state of a user, used in OSS."
    updateUserRole(input: UpdateUserRoleInput!): User! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.User}")

    toggleUsersBadge(input: ToggleUsersBadgeInput!): [User]! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.User}")
  }

  type User implements Node {
    "Global id of an user."
    id: ID!

    "Global unique user name of a user."
    userName: String

    "Display name on user profile, can be duplicated."
    displayName: String

    "LikerID of LikeCoin, being used by LikeCoin OAuth"
    likerId: String

    "Liker info of current user"
    liker: Liker!

    "URL for user avatar."
    avatar: String

    "User information."
    info: UserInfo!

    "the ipnsAddress if the user has any publications"
    ipnsAddress: String

    "User settings."
    settings: UserSettings! @auth(mode: "${AUTH_MODE.oauth}")

    "Article recommendations for current user."
    recommendation: Recommendation!

    "Articles authored by current user."
    articles(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Topics created by current user."
    topics(input: TopicInput!): TopicConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Tags by by usage order of current user."
    tags(input: ConnectionArgs!): TagConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Tags pinned by current user."
    pinnedTags(input: ConnectionArgs!): TagConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Drafts authored by current user."
    drafts(input: ConnectionArgs!): DraftConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @auth(mode: "${AUTH_MODE.oauth}")

    "Articles current user commented on"
    commentedArticles(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Artilces current user subscribed to."
    subscriptions(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @auth(mode: "${AUTH_MODE.oauth}")

    "Record of user activity, only accessable by current user."
    activity: UserActivity! @auth(mode: "${AUTH_MODE.oauth}")

    "Followers of this user."
    followers(input: ConnectionArgs!): UserConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Following contents of this user."
    following: Following!

    "Whether current user is following viewer."
    isFollower: Boolean!

    "Whether viewer is following current user."
    isFollowee: Boolean!

    "Users that blocked by current user."
    blockList(input: ConnectionArgs!): UserConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @auth(mode: "${AUTH_MODE.oauth}")

    "Whether current user is blocking viewer."
    isBlocking: Boolean!

    "Whether current user is blocked by viewer."
    isBlocked: Boolean!

    "Status of current user."
    status: UserStatus

    ##############
    #     OSS    #
    ##############
    oss: UserOSS! @auth(mode: "${AUTH_MODE.admin}")
    remark: String @auth(mode: "${AUTH_MODE.admin}")
  }

  type Recommendation {
    "Activities based on user's following, sort by creation time."
    following(input: ConnectionArgs!): FollowingActivityConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Articles recommended based on recently read article tags."
    readTagsArticles(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @deprecated(reason: "Merged into following")

    "Global articles sort by publish time."
    newest(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_ARTICLE})

    "Global articles sort by latest activity time."
    hottest(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_ARTICLE})

    "'In case you missed it' recommendation."
    icymi(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_ARTICLE})

    "Global tag list, sort by activities in recent 14 days."
    tags(input: RecommendInput!): TagConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_TAG})

    "Hottest tag list"
    hottestTags(input: RecommendInput!): TagConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_TAG})

    "Selected tag list"
    selectedTags(input: RecommendInput!): TagConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_TAG})

    "Global user list, sort by activities in recent 6 month."
    authors(input: RecommendInput!): UserConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_USER})

    "Global circles sort by created time."
    newestCircles(input: ConnectionArgs!): CircleConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @cacheControl(maxAge: ${CACHE_TTL.SHORT})

    "Global circles sort by latest activity time."
    hottestCircles(input: ConnectionArgs!): CircleConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @cacheControl(maxAge: ${CACHE_TTL.SHORT})
  }

  input RecommendInput {
    after: String
    first: Int @constraint(min: 0)
    oss: Boolean
    filter: FilterInput
    type: AuthorsType
  }

  input TopicInput {
    after: String
    first: Int @constraint(min: 0)
    filter: FilterInput
  }

  input FilterInput {
    "index of list, min: 0, max: 49"
    random: Int @constraint(min: 0, max: 49)

    "Used in RecommendInput"
    followed: Boolean

    "Used in User.topics"
    public: Boolean

    "Used in User Articles filter, by tags or by time range, or both"
    tagIds: [ID!]
    inRangeStart: DateTime
    inRangeEnd: DateTime
    # inRange: [DateTime] # [min,max] can be 1 side null to mean open in 1 side; not both null
  }

  type UserInfo {
    "Timestamp of registration."
    createdAt: DateTime

    "Is user name editable."
    userNameEditable: Boolean!

    "User desciption."
    description: String

    "User email."
    email: String @constraint(format: "email") @auth(mode: "${AUTH_MODE.oauth}")

    "User badges."
    badges: [Badge!]

    "Timestamp of user agreement."
    agreeOn: DateTime

    "Cover of profile page."
    profileCover: String

    "Type of group."
    group: UserGroup!

    "Login address"
    ethAddress: String

    isWalletAuth: Boolean!

    "Connected wallet."
    cryptoWallet: CryptoWallet
  }

  type UserSettings {
    "User language setting."
    language: UserLanguage!

    "Notification settings."
    notification: NotificationSetting!
  }

  type UserActivity {
    "User reading history."
    history(input: ConnectionArgs!): ReadHistoryConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "User search history."
    recentSearches(input: ConnectionArgs!): RecentSearchConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Appreciations current user gave."
    appreciationsSent(input: ConnectionArgs!): AppreciationConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Total number of appreciation current user gave."
    appreciationsSentTotal: Int!

    "Appreciations current user received."
    appreciationsReceived(input: ConnectionArgs!): AppreciationConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Total number of appreciation current user received."
    appreciationsReceivedTotal: Int!
  }

  type UserStatus {
    "User state."
    state: UserState!

    "User role and access level."
    role: UserRole! @auth(mode: "${AUTH_MODE.oauth}")

    "Number of articles published by user"
    articleCount: Int!

    "Number of comments posted by user."
    commentCount: Int!

    "Number of unread notices."
    unreadNoticeCount: Int! @auth(mode: "${AUTH_MODE.oauth}") @cacheControl(maxAge: ${CACHE_TTL.INSTANT})


    "Whether there are unread activities from following."
    unreadFollowing: Boolean! @cacheControl(maxAge: ${CACHE_TTL.INSTANT})

    "Number of total written words."
    totalWordCount: Int!
  }

  type Liker {
    "Liker ID of LikeCoin"
    likerId: String

    "Whether liker is a civic liker"
    civicLiker: Boolean! @objectCache(maxAge: ${CACHE_TTL.LONG})

    "Total LIKE left in wallet."
    total: Float! @auth(mode: "${AUTH_MODE.oauth}")

    "Rate of LikeCoin/USD"
    rateUSD: Float @objectCache(maxAge: ${CACHE_TTL.LONG})
  }

  type UserOSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    boost: Float!
    score: Float!
  }

  type Appreciation {
    amount: Int!
    purpose: AppreciationPurpose!
    content: String!

    "Timestamp of appreciation."
    createdAt: DateTime!

    "Recipient of appreciation."
    recipient: User! @logCache(type: "${NODE_TYPES.User}")

    "Sender of appreciation."
    sender: User @logCache(type: "${NODE_TYPES.User}")

    "Object that appreciation is meant for."
    target: Article @logCache(type: "${NODE_TYPES.Article}")
  }

  type NotificationSetting {
    enable: Boolean!
    email: Boolean!
    mention: Boolean!
    userNewFollower: Boolean!
    articleNewComment: Boolean!
    articleNewAppreciation: Boolean!
    articleNewSubscription: Boolean!
    articleNewCollected: Boolean!
    articleSubscribedNewComment: Boolean!
    articleCommentPinned: Boolean!

    "for circle owners"
    circleNewSubscriber: Boolean!
    circleNewFollower: Boolean!
    circleNewUnsubscriber: Boolean!
    circleMemberNewBroadcastReply: Boolean!
    circleMemberNewDiscussion: Boolean!
    circleMemberNewDiscussionReply: Boolean!

    "for circle members & followers"
    inCircleNewArticle: Boolean!
    inCircleNewBroadcast: Boolean!
    inCircleNewBroadcastReply: Boolean!
    inCircleNewDiscussion: Boolean!
    inCircleNewDiscussionReply: Boolean!
  }

  type ReadHistory {
    article: Article! @logCache(type: "${NODE_TYPES.Article}")
    readAt: DateTime!
  }

  type Badge {
    type: BadgeType!
  }

  type AuthResult {
    auth: Boolean!
    token: String
    type: AuthResultType!
  }

  enum AuthResultType {
    Login
    Signup
    LinkAccount
  }

  type SigningMessageResult {
    nonce: String!
    purpose: SigningMessagePurpose!
    signingMessage: String!
    createdAt: DateTime!
    expiredAt: DateTime!
  }

  type UserConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [UserEdge!]
  }

  type UserEdge {
    cursor: String!
    node: User! @logCache(type: "${NODE_TYPES.User}")
  }

  type ReadHistoryConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ReadHistoryEdge!]
  }

  type ReadHistoryEdge {
    cursor: String!
    node: ReadHistory!
  }

  type RecentSearchConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [RecentSearchEdge!]
  }

  type RecentSearchEdge {
    cursor: String!
    node: String!
  }

  type AppreciationConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [AppreciationEdge!]
  }

  type AppreciationEdge {
    cursor: String!
    node: Appreciation!
  }

  type FollowingActivityConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [FollowingActivityEdge!]
  }

  type FollowingActivityEdge {
    cursor: String!
    node: FollowingActivity!
  }

  union FollowingActivity = UserPublishArticleActivity
  | UserAddArticleTagActivity

  # circle activities
  | UserBroadcastCircleActivity
  | UserCreateCircleActivity

  # recommendation activities
  | UserRecommendationActivity
  | ArticleRecommendationActivity
  | CircleRecommendationActivity


  type UserPublishArticleActivity {
    actor: User! @logCache(type: "${NODE_TYPES.User}")
    createdAt: DateTime!

    "Article published by actor"
    node: Article! @logCache(type: "${NODE_TYPES.Article}")
  }

  type UserAddArticleTagActivity {
    actor: User! @logCache(type: "${NODE_TYPES.User}")
    createdAt: DateTime!

    "Article added to tag"
    node: Article! @logCache(type: "${NODE_TYPES.Article}")

    "Tag added by article"
    target: Tag! @logCache(type: "${NODE_TYPES.Tag}")
  }

  type UserBroadcastCircleActivity {
    actor: User! @logCache(type: "${NODE_TYPES.User}")
    createdAt: DateTime!

    "Comment broadcast by actor"
    node: Comment! @logCache(type: "${NODE_TYPES.Comment}")

    "Circle that comment belongs to"
    target: Circle! @logCache(type: "${NODE_TYPES.Circle}")
  }

  type UserCreateCircleActivity {
    actor: User! @logCache(type: "${NODE_TYPES.User}")
    createdAt: DateTime!

    "Circle created by actor"
    node: Circle! @logCache(type: "${NODE_TYPES.Circle}")
  }

  type UserRecommendationActivity {
    "The source type of recommendation"
    source: UserRecommendationActivitySource

    "Recommended users"
    nodes: [User!] @logCache(type: "${NODE_TYPES.User}")
  }

  enum UserRecommendationActivitySource {
    UserFollowing
  }

  type ArticleRecommendationActivity {
    "The source type of recommendation"
    source: ArticleRecommendationActivitySource

    "Recommended articles"
    nodes: [Article!] @logCache(type: "${NODE_TYPES.Article}")
  }

  enum ArticleRecommendationActivitySource {
    UserDonation
    ReadArticlesTags
  }

  type CircleRecommendationActivity {
    "The source type of recommendation"
    source: CircleRecommendationActivitySource

    "Recommended circles"
    nodes: [Circle!] @logCache(type: "${NODE_TYPES.Circle}")
  }

  enum CircleRecommendationActivitySource {
    UserSubscription
  }

  type Following {
    circles(input: ConnectionArgs!): CircleConnection! @cost(multipliers: ["input.first"], useMultipliers: true)
    tags(input: ConnectionArgs!): TagConnection! @cost(multipliers: ["input.first"], useMultipliers: true)
    users(input: ConnectionArgs!): UserConnection! @cost(multipliers: ["input.first"], useMultipliers: true)
  }

  type CryptoWallet {
    id: ID!
    address: String!
    # createdAt: DateTime!

    """ does this address own any Travelogger NFTs? this value is cached at most 1day, and refreshed at next \`nfts\` query """
    hasNFTs: Boolean! @objectCache(maxAge: ${CACHE_TTL.LONG})

    """NFT assets owned by this wallet address"""
    nfts: [NFTAsset!]
  }

  """ NFT Asset """
  type NFTAsset {
    id: ID!
    name: String!
    description: String
    imageUrl: String!
    imagePreviewUrl: String
    """imageOriginalUrl: String!"""
    contractAddress: String!
    collectionName: String!
    tokenMetadata: String
    openseaPermalink: String!
  }

  input UserInput {
    userName: String
    ethAddress: String
  }

  input SendVerificationCodeInput {
    email: String! @constraint(format: "email")
    type: VerificationCodeType!
    token: String

    """
    Redirect URL embedded in the verification email,
    use code instead if not provided.
    """
    redirectUrl: String @constraint(format: "uri")
  }

  input ConfirmVerificationCodeInput {
    email: String! @constraint(format: "email")
    type: VerificationCodeType!
    code: String!
  }

  input ResetPasswordInput {
    password: String!
    codeId: ID!
    type: ResetPasswordType
  }

  input ChangeEmailInput {
    oldEmail: String! @constraint(format: "email")
    oldEmailCodeId: ID!
    newEmail: String! @constraint(format: "email")
    newEmailCodeId: ID!
  }

  input VerifyEmailInput {
    codeId: ID!
  }

  input UserRegisterInput {
    email: String! @constraint(format: "email")
    userName: String
    displayName: String!
    password: String!
    description: String
    codeId: ID!
  }

  input UserLoginInput {
    email: String! @constraint(format: "email")
    password: String!
  }

  input GenerateSigningMessageInput {
    address: String!
    purpose: SigningMessagePurpose
  }

  input WalletLoginInput {
    ethAddress: String!

    "the message being sign'ed, including nonce"
    signedMessage: String!

    "sign'ed by wallet"
    signature: String!

    "nonce from generateSigningMessage"
    nonce: String!

    "required for wallet register"
    email: String @constraint(format: "email")

    "email verification code, required for wallet register"
    codeId: ID
  }

  input ResetLikerIdInput {
    id: ID!
  }

  input ResetWalletInput {
    id: ID!
  }

  input UpdateNotificationSettingInput {
    type: NotificationSettingType!
    enabled: Boolean!
  }

  input UpdateUserInfoInput {
    displayName: String
    userName: String
    avatar: ID
    description: String
    language: UserLanguage
    agreeOn: Boolean
    profileCover: ID
    paymentPassword: String
    paymentPointer: String
  }

  input UpdateUserStateInput {
    id: ID
    emails: [String!]
    state: UserState!
    banDays: Int @constraint(exclusiveMin: 0)
    password: String
  }

  input UpdateUserRoleInput {
    id: ID!
    role: UserRole!
  }

  input ToggleUsersBadgeInput {
    ids: [ID!]
    type: BadgeType!
    enabled: Boolean!
  }

  input ClearReadHistoryInput {
    id: ID!
  }

  input MigrationInput {
    type: MigrationType
    files: [Upload]!
  }

  input ClaimLogbooksInput {
    ethAddress: String!

    "the message being sign'ed, including nonce"
    signedMessage: String!

    "sign'ed by wallet"
    signature: String!

    "nonce from generateSigningMessage"
    nonce: String!
  }

  type ClaimLogbooksResult {
    # claimed token ids
    ids: [ID!]

    # transaction hash
    txHash: String!
  }

  enum BadgeType {
    seed
    golden_motor
    architect
  }

  enum VerificationCodeType {
    register
    email_reset
    email_reset_confirm
    password_reset
    payment_password_reset
  }

  enum ResetPasswordType {
    account
    payment
  }

  enum UserInfoFields {
    displayName
    avatar
    description
    email
    agreeOn
  }

  enum UserLanguage {
    en
    zh_hans
    zh_hant
  }

  enum NotificationSettingType {
    enable
    email
    mention
    userNewFollower
    articleNewComment
    articleNewAppreciation
    articleNewSubscription
    articleNewCollected
    articleSubscribedNewComment
    articleCommentPinned

    "for circle owners"
    circleNewSubscriber
    circleNewFollower
    circleNewUnsubscriber
    circleNewDiscussion
    circleMemberBroadcast # deprecated
    circleMemberNewDiscussion
    circleMemberNewDiscussionReply
    circleMemberNewBroadcastReply

    "for circle members"
    inCircleNewArticle
    inCircleNewBroadcast
    inCircleNewBroadcastReply
    inCircleNewDiscussion
    inCircleNewDiscussionReply
  }

  enum UserState {
    active
    onboarding
    banned
    archived
    frozen
  }

  enum UserRole {
    user
    admin
  }

  enum UserGroup {
    a
    b
  }

  enum AppreciationPurpose {
    appreciate
    appreciateComment
    appreciateSubsidy
    invitationAccepted
    joinByInvitation
    joinByTask
    firstPost
    systemSubsidy
  }

  enum MigrationType {
    medium
  }

  enum AuthorsType {
    active
    appreciated
    default
    trendy
  }

  enum CryptoWalletSignaturePurpose {
    airdrop
    connect
    signup
    login
  }

  enum SigningMessagePurpose {
    airdrop
    connect
    signup
    login
    claimLogbook
  }
`
