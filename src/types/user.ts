import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    viewer: User @privateCache @logCache(type: "${NODE_TYPES.user}")
    user(input: UserInput!): User @privateCache @logCache(type: "${NODE_TYPES.user}")
  }

  extend type Mutation {
    "Send verification code for email."
    sendVerificationCode(input: SendVerificationCodeInput!): Boolean

    "Confirm verification code from email."
    confirmVerificationCode(input: ConfirmVerificationCodeInput!): ID!

    "Reset user or payment password."
    resetPassword(input: ResetPasswordInput!): Boolean

    "Change user email."
    changeEmail(input: ChangeEmailInput!): User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.user}")

    "Verify user email."
    verifyEmail(input: VerifyEmailInput!): Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}")

    "Register user, can only be used on matters.news website."
    userRegister(input: UserRegisterInput!): AuthResult!

    "Login user."
    userLogin(input: UserLoginInput!): AuthResult!

    "Logout user."
    userLogout: Boolean!

    "Generate or claim a Liker ID through LikeCoin"
    generateLikerId: User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.user}")

    "Update user information."
    updateUserInfo(input: UpdateUserInfoInput!): User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.user}")

    "Update user notification settings."
    updateNotificationSetting(input: UpdateNotificationSettingInput!): User!
      @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.user}")

    "Follow or Unfollow current user."
    toggleFollowUser(input: ToggleItemInput!): User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.user}")

    "Block or Unblock a given user."
    toggleBlockUser(input: ToggleItemInput!): User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.user}")

    "Subscribe/ Unsubscribe Push Notification."
    toggleSubscribePush(input: ToggleItemInput!): User! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.user}")

    "Clear read history for user."
    clearReadHistory(input: ClearReadHistoryInput!): Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")

    "Clear search history for user."
    clearSearchHistory: Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")

    "Migrate articles from other service provider."
    migration(input: MigrationInput!): Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}")

    ##############
    #     OSS    #
    ##############
    "Update state of a user, used in OSS."
    updateUserState(input: UpdateUserStateInput!): [User!] @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.user}")

    "Update state of a user, used in OSS."
    updateUserRole(input: UpdateUserRoleInput!): User! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.user}")
  }

  type User implements Node {
    "Global id of an user."
    id: ID!

    "UUID of an user, for backward compatibility."
    uuid: UUID!

    "Global unique user name of a user."
    userName: String

    "Display name on user profile, can be duplicated."
    displayName: String

    "LikerID of LikeCoin, being used by LikeCoin OAuth"
    likerId: String

    "Liker info of current user"
    liker: Liker!

    "URL for user avatar."
    avatar: URL

    "User information."
    info: UserInfo!

    "User settings."
    settings: UserSettings! @auth(mode: "${AUTH_MODE.oauth}")

    "Article recommendations for current user."
    recommendation: Recommendation!

    "Articles authored by current user."
    articles(input: ConnectionArgs!): ArticleConnection!

    "Tags owned and maintained by current user."
    tags(input: ConnectionArgs!): TagConnection!

    "Drafts authored by current user."
    drafts(input: ConnectionArgs!): DraftConnection! @auth(mode: "${AUTH_MODE.oauth}")

    "Articles current user commented on"
    commentedArticles(input: ConnectionArgs!): ArticleConnection!

    "Artilces current user subscribed to."
    subscriptions(input: ConnectionArgs!): ArticleConnection! @auth(mode: "${AUTH_MODE.oauth}")

    "Record of user activity, only accessable by current user."
    activity: UserActivity! @auth(mode: "${AUTH_MODE.oauth}")

    "Followers of this user."
    followers(input: ConnectionArgs!): UserConnection!

    "Users that this user follows."
    followees(input: ConnectionArgs!): UserConnection!

    "Whether current user is following viewer."
    isFollower: Boolean!

    "Whether viewer is following current user."
    isFollowee: Boolean!

    "Users that blocked by current user."
    blockList(input: ConnectionArgs!): UserConnection! @auth(mode: "${AUTH_MODE.oauth}")

    "Whether current user is blocking viewer."
    isBlocking: Boolean!

    "Whether current user is blocked by viewer."
    isBlocked: Boolean!

    "Status of current user."
    status: UserStatus

    # OSS
    oss: UserOSS! @auth(mode: "${AUTH_MODE.admin}")
    remark: String @auth(mode: "${AUTH_MODE.admin}")
  }

  type Recommendation {
    "Articles published by user's followees."
    followeeArticles(input: ConnectionArgs!): ArticleConnection! @auth(mode: "${AUTH_MODE.oauth}")

    "Comments published by user's followees."
    followeeComments(input: ConnectionArgs!): CommentConnection! @auth(mode: "${AUTH_MODE.oauth}")

    "Articles that followee donated"
    followeeDonatedArticles(input: ConnectionArgs!): FolloweeDonatedArticleConnection! @auth(mode: "${AUTH_MODE.oauth}")

    "Tags that user followed."
    followingTags(input: ConnectionArgs!): TagConnection! @auth(mode: "${AUTH_MODE.oauth}")

    "Articles has been added into followed tags."
    followingTagsArticles(input: ConnectionArgs!): ArticleConnection! @auth(mode: "${AUTH_MODE.oauth}")

    "Global articles sort by publish time."
    newest(input: ConnectionArgs!): ArticleConnection! @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_ARTICLE})

    "Global articles sort by latest activity time."
    hottest(input: ConnectionArgs!): ArticleConnection! @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_ARTICLE})

    "'In case you missed it' recommendation."
    icymi(input: ConnectionArgs!): ArticleConnection! @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_ARTICLE})

    "Global articles sort by appreciate, donation and subscription."
    valued(input: ConnectionArgs!): ArticleConnection! @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_ARTICLE})

    "Global tag list, sort by activities in recent 14 days."
    tags(input: RecommendationTagsInput!): TagConnection! @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_TAG})

    "Gloabl article list, sort by activities in recent 72 hours."
    topics(input: ConnectionArgs!): ArticleConnection! @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_ARTICLE})

    "Global user list, sort by activities in recent 6 month."
    authors(input: AuthorsInput!): UserConnection! @cacheControl(maxAge: ${CACHE_TTL.PUBLIC_FEED_USER})

    "Personalized recommendation based on interaction with tags."
    interest(input: ConnectionArgs!): ArticleConnection!

    "Recommend articles with collaborative filtering"
    recommendArticles(input: ConnectionArgs!): ArticleConnection!
  }

  input AuthorsInput {
    after: String
    first: Int
    oss: Boolean
    filter: AuthorsFilter
  }

  input AuthorsFilter {
    "index of author list, min: 0, max: 49"
    random: NonNegativeInt
    followed: Boolean
  }

  type UserInfo {
    "Timestamp of registration."
    createdAt: DateTime

    "Is user name editable."
    userNameEditable: Boolean!

    "User desciption."
    description: String

    "User email."
    email: Email @auth(mode: "${AUTH_MODE.oauth}")

    "User badges."
    badges: [Badge!]

    "Timestamp of user agreement."
    agreeOn: DateTime

    "Cover of profile page."
    profileCover: URL

    "Type of group."
    group: UserGroup!
  }

  type UserSettings {
    "User language setting."
    language: UserLanguage!

    "Notification settings."
    notification: NotificationSetting!
  }

  type UserActivity {
    "User reading history."
    history(input: ConnectionArgs!): ReadHistoryConnection!

    "User search history."
    recentSearches(input: ConnectionArgs!): RecentSearchConnection!

    "Appreciations current user gave."
    appreciationsSent(input: ConnectionArgs!): AppreciationConnection!

    "Total number of appreciation current user gave."
    appreciationsSentTotal: Int!

    "Appreciations current user received."
    appreciationsReceived(input: ConnectionArgs!): AppreciationConnection!

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

    "Whether there are unread articles from followees."
    unreadFolloweeArticles: Boolean! @cacheControl(maxAge: ${CACHE_TTL.INSTANT})

    "Whether user already set payment password."
    hasPaymentPassword: Boolean!

    "Number of total written words."
    totalWordCount: Int!
  }

  type Liker {
    "Liker ID of LikeCoin"
    likerId: String

    "Whether liker is a civic liker"
    civicLiker: Boolean! @objectCache(maxAge: ${CACHE_TTL.LONG})

    "Total LIKE left in wallet."
    total: NonNegativeFloat! @auth(mode: "${AUTH_MODE.oauth}")

    "Rate of LikeCoin/USD"
    rateUSD: NonNegativeFloat @objectCache(maxAge: ${CACHE_TTL.LONG})
  }

  type UserOSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    boost: NonNegativeFloat!
    score: NonNegativeFloat!
  }

  type Appreciation {
    amount: Int!
    purpose: AppreciationPurpose!
    content: String!

    "Timestamp of appreciation."
    createdAt: DateTime!

    "Recipient of appreciation."
    recipient: User! @logCache(type: "${NODE_TYPES.user}")

    "Sender of appreciation."
    sender: User @logCache(type: "${NODE_TYPES.user}")

    "Object that appreciation is meant for."
    target: Article @logCache(type: "${NODE_TYPES.article}")
  }

  type NotificationSetting {
    enable: Boolean!
    email: Boolean!
    mention: Boolean!
    follow: Boolean!
    comment: Boolean!
    appreciation: Boolean!
    articleSubscription: Boolean!
    commentSubscribed: Boolean!
    downstream: Boolean!
    commentPinned: Boolean!
    commentVoted: Boolean!
    officialNotice: Boolean!
    reportFeedback: Boolean!
  }

  type ReadHistory {
    article: Article! @logCache(type: "${NODE_TYPES.article}")
    readAt: DateTime!
  }

  type Badge {
    type: BadgeType!
  }

  type AuthResult {
    auth: Boolean!
    token: String
  }

  type UserConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [UserEdge!]
  }

  type UserEdge {
    cursor: String!
    node: User! @logCache(type: "${NODE_TYPES.user}")
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

  type FolloweeDonatedArticleConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [FolloweeDonatedArticleEdge!]
  }

  type FolloweeDonatedArticleEdge {
    cursor: String!
    node: FolloweeDonatedArticle!
  }

  type FolloweeDonatedArticle {
    article: Article! @logCache(type: "${NODE_TYPES.article}")
    followee: User! @logCache(type: "${NODE_TYPES.user}")
  }

  input UserInput {
    userName: String!
  }

  input SendVerificationCodeInput {
    email: Email!
    type: VerificationCodeType!
    token: String
  }

  input ConfirmVerificationCodeInput {
    email: Email!
    type: VerificationCodeType!
    code: String!
  }

  input ResetPasswordInput {
    password: String!
    codeId: ID!
    type: ResetPasswordType
  }

  input ChangeEmailInput {
    oldEmail: Email!
    oldEmailCodeId: ID!
    newEmail: Email!
    newEmailCodeId: ID!
  }

  input VerifyEmailInput {
    codeId: ID!
  }

  input UserRegisterInput {
    email: Email!
    userName: String
    displayName: String!
    password: String!
    description: String
    codeId: ID!
  }

  input UserLoginInput {
    email: Email!
    password: String!
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
  }

  input UpdateUserStateInput {
    id: ID
    emails: [String!]
    state: UserState!
    banDays: PositiveInt
    password: String
  }

  input UpdateUserRoleInput {
    id: ID!
    role: UserRole!
  }

  input ClearReadHistoryInput {
    id: ID!
  }

  input MigrationInput {
    type: MigrationType
    files: [Upload]!
  }

  input RecommendationTagsInput {
    after: String
    first: Int
    oss: Boolean
    filter: RecommendationTagsFilter
  }

  input RecommendationTagsFilter {
    "index of tag list, min: 0, max: 49"
    random: NonNegativeInt
  }

  enum BadgeType {
    seed
  }

  enum VerificationCodeType {
    register
    email_reset
    email_reset_confirm
    password_reset
    payment_password_reset
    email_verify
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
    follow
    comment
    appreciation
    articleSubscription
    commentSubscribed
    downstream
    commentPinned
    commentVoted
    officialNotice
    reportFeedback
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
`
