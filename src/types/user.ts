import { CACHE_TTL, NODE_TYPES } from 'common/enums'

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
    changeEmail(input: ChangeEmailInput!): User! @authenticate @purgeCache

    "Verify user email."
    verifyEmail(input: VerifyEmailInput!): Boolean @authenticate

    "Register user, can only be used on matters.news website."
    userRegister(input: UserRegisterInput!): AuthResult!

    "Login user."
    userLogin(input: UserLoginInput!): AuthResult!

    "Logout user."
    userLogout: Boolean!

    "Generate or claim a Liker ID through LikeCoin"
    generateLikerId: User! @authenticate @purgeCache

    "Update user information."
    updateUserInfo(input: UpdateUserInfoInput!): User! @authenticate @purgeCache

    "Update user notification settings."
    updateNotificationSetting(input: UpdateNotificationSettingInput!): User!
      @authenticate @purgeCache

    "Follow or Unfollow current usere."
    toggleFollowUser(input: ToggleItemInput!): User! @authenticate @purgeCache

    "Block or Unblock a given user."
    toggleBlockUser(input: ToggleItemInput!): User! @authenticate @purgeCache

    "Subscribe/ Unsubscribe Push Notification."
    toggleSubscribePush(input: ToggleItemInput!): User! @authenticate @purgeCache

    "Clear read history for user."
    clearReadHistory(input: ClearReadHistoryInput!): Boolean @authenticate

    "Clear search history for user."
    clearSearchHistory: Boolean @authenticate

    "Migrate articles from other service provider."
    migration(input: MigrationInput!): Boolean @authenticate

    ##############
    #     OSS    #
    ##############
    "Update state of a user, used in OSS."
    updateUserState(input: UpdateUserStateInput!): User! @authorize @purgeCache
    "Update state of a user, used in OSS."
    updateUserRole(input: UpdateUserRoleInput!): User! @authorize @purgeCache


    ##############
    # DEPRECATED #
    ##############
    "Block a given user."
    blockUser(input: BlockUserInput!): User! @authenticate @purgeCache @deprecated(reason: "Use \`toggleBlockUser\`.")

    "Unblock a given user."
    unblockUser(input: BlockUserInput!): User! @authenticate @purgeCache @deprecated(reason: "Use \`toggleBlockUser\`.")

    "Follow a given user."
    followUser(input: FollowUserInput!): User! @authenticate @purgeCache @deprecated(reason: "Use \`toggleFollowUser\`.")

    "Unfollow curent user."
    unfollowUser(input: FollowUserInput!): User! @authenticate @purgeCache @deprecated(reason: "Use \`toggleFollowUser\`.")

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

    "LikerID of LikeCoin"
    likerId: String @scope @deprecated(reason: "Use \`liker.likerId\`.")

    "Liker info of current user"
    liker: Liker!

    "URL for user avatar."
    avatar: URL

    "User information."
    info: UserInfo!

    "User settings."
    settings: UserSettings! @scope

    "Article recommendations for current user."
    recommendation: Recommendation! @scope

    "Articles authored by current user."
    articles(input: ConnectionArgs!): ArticleConnection!

    "Drafts authored by current user."
    drafts(input: ConnectionArgs!): DraftConnection! @scope

    "Articles current user commented on"
    commentedArticles(input: ConnectionArgs!): ArticleConnection!

    "Artilces current user subscribed to."
    subscriptions(input: ConnectionArgs!): ArticleConnection! @scope

    "Record of user activity, only accessable by current user."
    activity: UserActivity! @scope

    "Followers of this user."
    followers(input: ConnectionArgs!): UserConnection!

    "Users that this user follows."
    followees(input: ConnectionArgs!): UserConnection!

    "Whether current user is following viewer."
    isFollower: Boolean!

    "Whether viewer is following current user."
    isFollowee: Boolean!

    "Users that blocked by current user."
    blockList(input: ConnectionArgs!): UserConnection! @scope

    "Whether current user is blocking viewer."
    isBlocking: Boolean!

    "Whether current user is blocked by viewer."
    isBlocked: Boolean!

    "Status of current user."
    status: UserStatus

    # OSS
    oss: UserOSS! @authorize
    remark: String @authorize
  }

  type Recommendation {
    "Articles published by user's followees."
    followeeArticles(input: ConnectionArgs!): ArticleConnection! @deprecated(reason: "Use \`followeeWorks\`.")

    "Articles and comments published by user's followees."
    followeeWorks(input: ResponsesInput!): ResponseConnection!

    "Global articles sort by publish time."
    newest(input: ConnectionArgs!): ArticleConnection!

    "Global articles sort by latest activity time."
    hottest(input: ConnectionArgs!): ArticleConnection!

    "'Matters Today' recommendation."
    today: Article @logCache(type: "${NODE_TYPES.article}")

    "'In case you missed it' recommendation."
    icymi(input: ConnectionArgs!): ArticleConnection!

    "Global tag list, sort by activities in recent 14 days."
    tags(input: ConnectionArgs!): TagConnection!

    "Gloabl article list, sort by activities in recent 72 hours."
    topics(input: ConnectionArgs!): ArticleConnection!

    "Global user list, sort by activities in recent 6 month."
    authors(input: AuthorsInput!): UserConnection!

    "Recommend articles usings collaborative filtering"
    recommendArticles(input: ConnectionArgs!): ArticleConnection!
  }

  input AuthorsInput {
    after: String
    first: Int
    oss: Boolean
    filter: AuthorsFilter
  }

  input AuthorsFilter {
    random: Boolean
    followed: Boolean
  }

  type UserInfo {
    "Timestamp of registration."
    createdAt: DateTime!

    "Is user name editable."
    userNameEditable: Boolean!

    "User desciption."
    description: String

    "User email."
    email: Email @scope

    "User badges."
    badges: [Badge!]

    "Timestamp of user agreement."
    agreeOn: DateTime

    "Cover of profile page."
    profileCover: URL
  }

  type UserSettings {
    "User language setting."
    language: UserLanguage!
    # Notification settings
    "Notification settings."
    notification: NotificationSetting!
    oauthProviders: [OAuthProvider!]
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
    role: UserRole! @scope

    "Total LIKE left in wallet."
    LIKE: LIKE! @scope @deprecated(reason: "Use \`liker.total\` and \`liker.rateUSD\`.")

    "Number of articles published by user"
    articleCount: Int!

    "Number of comments posted by user."
    commentCount: Int!

    "Number of unread notices."
    unreadNoticeCount: Int! @scope @cacheControl(maxAge: ${CACHE_TTL.INSTANT})

    "Whether there are unread articles from followees."
    unreadFolloweeArticles: Boolean! @cacheControl(maxAge: ${CACHE_TTL.INSTANT})

    "Whether user has read response info or not."
    unreadResponseInfoPopUp: Boolean!

    "Number of total written words."
    totalWordCount: Int!
  }

  type Liker {
    "Liker ID of LikeCoin"
    likerId: String

    "Whether liker is a civic liker"
    civicLiker: Boolean! @objectCache(maxAge: ${CACHE_TTL.LONG})

    "Total LIKE left in wallet."
    total: NonNegativeFloat! @scope

    "Rate of LikeCoin/USD"
    rateUSD: NonNegativeFloat
  }

  type UserOSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    boost: NonNegativeFloat!
    score: NonNegativeFloat!
  }

  type LIKE {
    total: NonNegativeFloat!
    rateUSD: NonNegativeFloat
  }

  type Appreciation {
    amount: Int!
    purpose: AppreciationPurpose!
    content: String!

    "Timestamp of appreciation."
    createdAt: DateTime!

    "Recipient of appreciation."
    recipient: User!

    "Sender of appreciation."
    sender: User

    "Object that appreciation is meant for."
    target: Article
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
    article: Article!
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
    node: User!
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
    id: ID!
    state: UserState!
    banDays: PositiveInt
    password: String
  }

  input UpdateUserRoleInput {
    id: ID!
    role: UserRole!
  }

  input FollowUserInput {
    id: ID!
  }


  input BlockUserInput {
    id: ID!
  }

  input ImportArticlesInput {
    platform: String
    token: String
  }

  input ClearReadHistoryInput {
    id: ID!
  }

  input MigrationInput {
    type: MigrationType
    files: [Upload]!
  }

  enum BadgeType {
    seed
  }

  enum VerificationCodeType {
    register
    email_reset
    email_reset_confirm
    password_reset
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

  enum OAuthProvider {
    facebook
    wechat
    google
  }

  enum UserState {
    active
    onboarding
    banned
    archived
  }

  enum UserRole {
    user
    admin
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
