import { CACHE_TTL, NODE_TYPES } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    viewer: User @privateCache(strict: true)
    user(input: UserInput!): User @privateCache @logCache(type: "${NODE_TYPES.user}")
  }

  extend type Mutation {
    "Send verification code for email."
    sendVerificationCode(input: SendVerificationCodeInput!): Boolean

    "Confirm verification code from email."
    confirmVerificationCode(input: ConfirmVerificationCodeInput!): ID!

    "Reset user password."
    resetPassword(input: ResetPasswordInput!): Boolean

    "Change user email."
    changeEmail(input: ChangeEmailInput!): User! @authenticate @purgeCache

    "Verify user email."
    verifyEmail(input: VerifyEmailInput!): Boolean @authenticate

    "Register user."
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

    "Follow a given user."
    followUser(input: FollowUserInput!): User! @authenticate @purgeCache

    "Unfollow curent user."
    unfollowUser(input: UnfollowUserInput!): User! @authenticate @purgeCache

    "Clear read history for user."
    clearReadHistory(input: ClearReadHistoryInput!): Boolean @authenticate

    "Clear search history for user."
    clearSearchHistory: Boolean @authenticate

    "Update state of a user, used in OSS."
    updateUserState(input: UpdateUserStateInput!): User! @authorize @purgeCache
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
    likerId: String @scope

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

    "Audiodraft by user, currently not used."
    audiodrafts(input: ConnectionArgs!): AudiodraftConnection! @scope

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

    "Status of current user."
    status: UserStatus

    # OSS
    oss: UserOSS! @authorize
    remark: String @authorize
  }

  type Recommendation {
    "Articles published by user's followees."
    followeeArticles(input: ConnectionArgs!): ArticleConnection!

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

    "Unique user name."
    userName: String! @deprecated(reason: "Use \`User.userName\`.")

    "Is user name editable."
    userNameEditable: Boolean!

    "Display name on profile."
    displayName: String! @deprecated(reason: "Use \`User.displayName\`.")

    "User desciption."
    description: String

    "URL for avatar."
    avatar: URL @deprecated(reason: "Use \`User.avatar\`.")

    "User email."
    email: Email @scope

    "Is email verified."
    emailVerified: Boolean

    "Moble number."
    mobile: String @scope

    "User reading speed, 500 as default."
    readSpeed: Int!

    "User badges."
    badges: [Badge!]

    "Timestamp of user agreement."
    agreeOn: DateTime

    "Number of total written words."
    totalWordCount: Int!
      @deprecated(reason: "Use \`User.status.totalWordCount\`.")

    "Cover of profile page."
    profileCover: URL
  }

  type UserSettings {
    "User language setting."
    language: UserLanguage! @cacheControl(maxAge: ${CACHE_TTL.INSTANT})
    # Notification settings
    "Notification settings."
    notification: NotificationSetting!
  }

  type UserActivity {
    "User reading history."
    history(input: ConnectionArgs!): ReadHistoryConnection!

    "User search history."
    recentSearches(input: ConnectionArgs!): RecentSearchConnection!

    "Appreciations current user gave."
    appreciations(input: ConnectionArgs): TransactionConnection!

    "Total number of appreciation current user gave."
    totalAppreciation: Int!

    "Appreciations current user received."
    appreciatedBy(input: ConnectionArgs): TransactionConnection!

    "Total number of appreciation current user received."
    totalAppreciatedBy: Int!
  }

  type UserStatus {
    "User state."
    state: UserState!

    "User role and access level."
    role: UserRole!

    "Total LIKE left in wallet."
    LIKE: LIKE! @scope

    "Total MAT left in wallet."
    MAT: MAT! @scope @deprecated(reason: "Use 'UserActivity instead'.")

    "Invitation. Deprecated."
    invitation: InvitationStatus @deprecated(reason: "removed")

    "Number of articles published by user"
    articleCount: Int!

    "Number of views on user articles. Not yet in use."
    viewCount: Int! @scope

    "Number of draft of user."
    draftCount: Int!
      @scope
      @deprecated(reason: "Use \`User.drafts.totalCount\`.")

    "Number of comments posted by user."
    commentCount: Int!

    subscriptionCount: Int!
      @scope
      @deprecated(reason: "Use \`User.subscriptions.totalCount\`.")

    followeeCount: Int!
      @deprecated(reason: "Use \`User.followees.totalCount\`.")

    followerCount: Int!
      @deprecated(reason: "Use \`User.followers.totalCount\`.")

    "Number of unread notices."
    unreadNoticeCount: Int! @scope

    "Whether there are unread articles from followees."
    unreadFolloweeArticles: Boolean!

    "Whether user has read response info or not."
    unreadResponseInfoPopUp: Boolean!

    "Number of total written words."
    totalWordCount: Int!
  }

  ## TODO: remove in OSS
  type InvitationStatus {
    reward: String
    # invitation number left
    left: Int
    # invitations sent
    sent(input: ConnectionArgs!): InvitationConnection
  }

  ## TODO: remove in OSS
  type Invitation {
    id: ID!
    user: User
    email: String
    accepted: Boolean!
    createdAt: DateTime!
  }

  ## TODO: remove in OSS
  type InvitationConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [InvitationEdge!]
  }

  ## TODO: remove in OSS
  type InvitationEdge {
    cursor: String!
    node: Invitation!
  }

  type UserOSS @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    boost: NonNegativeFloat!
    score: NonNegativeFloat!
  }

  type MAT {
    total: Int!
    history(input: ConnectionArgs!): TransactionConnection!
  }

  type LIKE {
    total: NonNegativeFloat!
    rateUSD: NonNegativeFloat
  }

  type Transaction {
    delta: Int!  @deprecated(reason: "use 'amount' instead.")
    amount: Int!
    purpose: TransactionPurpose!
    content: String!

    "Timestamp of transaction."
    createdAt: DateTime!

    "Unit of transaction used."
    unit: TransactionUnit!

    "Recipient of transaction."
    recipient: User!

    "Sender of transaction."
    sender: User

    "Object that transaction is meant for."
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
    # walletUpdate: Boolean!
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
    token: String @deprecated(reason: "Use cookie for auth.")
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

  type TransactionConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [TransactionEdge!]
  }

  type TransactionEdge {
    cursor: String!
    node: Transaction!
  }

  input UserInput {
    userName: String!
  }

  input SendVerificationCodeInput {
    email: Email!
    type: VerificationCodeType!
  }

  input ConfirmVerificationCodeInput {
    email: Email!
    type: VerificationCodeType!
    code: String!
  }

  input ResetPasswordInput {
    password: String!
    codeId: ID!
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
  }

  input UpdateUserStateInput {
    id: ID!
    state: UserState!
    banDays: PositiveInt
  }

  input FollowUserInput {
    id: ID!
  }

  input UnfollowUserInput {
    id: ID!
  }

  input ImportArticlesInput {
    platform: String
    token: String
  }

  input ClearReadHistoryInput {
    id: ID!
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

  enum UserInfoFields {
    displayName
    avatar
    description
    email
    mobile
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
    frozen
    archived
  }

  enum UserRole {
    user
    admin
  }

  enum TransactionUnit {
    mat
    like
  }

  enum TransactionPurpose {
    appreciate
    appreciateComment
    appreciateSubsidy
    invitationAccepted
    joinByInvitation
    joinByTask
    firstPost
    systemSubsidy
  }
`
