export default /* GraphQL */ `
  extend type Query {
    viewer: User
    user(input: UserInput!): User
  }

  extend type Mutation {
    # send/confirm verification code
    sendVerificationCode(input: SendVerificationCodeInput!): Boolean
    confirmVerificationCode(input: ConfirmVerificationCodeInput!): ID!
    # change or reset password
    resetPassword(input: ResetPasswordInput!): Boolean
    # change email
    changeEmail(input: ChangeEmailInput!): Boolean
    # verify email
    verifyEmail(input: VerifyEmailInput!): Boolean
    # register
    userRegister(input: UserRegisterInput!): AuthResult!
    # login
    userLogin(input: UserLoginInput!): AuthResult!
    # addOAuth(input: AddOAuthInput!): Boolean
    # update info/ setting
    updateUserInfo(input: UpdateUserInfoInput!): User!
    updateNotificationSetting(input: UpdateNotificationSettingInput!): NotificationSetting
    # follow/unfollow
    followUser(input: FollowUserInput!): Boolean @auth(requires: user)
    unfollowUser(input: UnfollowUserInput!): Boolean @auth(requires: user)
    # misc
    # importArticles(input: ImportArticlesInput!): [Article!]
    clearReadHistory(input: ClearReadHistoryInput!): Boolean
    clearSearchHistory: Boolean
    invite(input: InviteInput!): Boolean @auth(requires: user)

    # !!! update state: REMOVE IN PRODUTION !!!
    updateUserState__(input: UpdateUserStateInput!): User!
  }

  type User implements Node {
    id: ID!
    uuid: UUID!
    info: UserInfo!
    settings: UserSettings!
    recommendation: Recommendation!
    # Articles written by this user
    articles(input: ConnectionArgs!): ArticleConnection!
    drafts(input: ConnectionArgs!): DraftConnection!
    audiodrafts(input: ConnectionArgs!): AudiodraftConnection!
    # Comments posted by this user
    commentedArticles(input: ConnectionArgs!): ArticleConnection!
    subscriptions(input: ConnectionArgs!): ArticleConnection!
    activity: UserActivity!
    # Followers of this user
    followers(input: ConnectionArgs!): UserConnection!
    # Users that this user follows
    followees(input: ConnectionArgs!): UserConnection!
    # This user is following viewer
    isFollower: Boolean!
    # Viewer is following this user
    isFollowee: Boolean!
    status: UserStatus!
    # OSS
    oss: UserOSS! @auth(requires: admin)
    remark: String @auth(requires: admin)
  }

  type InvitationStatus {
    MAT: Int!
    # invitation number left
    left: Int!
    # invitations sent
    sent(input: ConnectionArgs!): InvitationConnection!
  }

  type Invitation implements Node  {
    id: ID!
    user: User
    email: String
    accepted: Boolean!
    createdAt: DateTime!
  }

  type Recommendation {
    followeeArticles(input: ConnectionArgs!): ArticleConnection!
    newest(input: ConnectionArgs!): ArticleConnection!
    hottest(input: ConnectionArgs!): ArticleConnection!
    # Matters Today
    today: Article!
    # In case you missed it
    icymi(input: ConnectionArgs!): ArticleConnection!
    tags(input: ConnectionArgs!): TagConnection!
    topics(input: ConnectionArgs!): ArticleConnection!
    authors(input: AuthorsInput!): UserConnection!
  }

  input AuthorsInput {
    after: String
    first: Int
    filter: AuthorsFilter
  }

  input AuthorsFilter {
    random: Boolean
    followed: Boolean
  }

  type UserInfo {
    createdAt: DateTime!
    # Unique user name
    userName: String!
    # Is user name editable
    userNameEditable: Boolean!
    # Display name on profile
    displayName: String!
    # User desciption
    description: String
    # URL for avatar
    avatar: URL
    email: Email
    emailVerified: Boolean
    mobile: String
    # Use 500 for now, adaptive in the future
    readSpeed: Int!
    badges: [Badge!]
  }

  type UserSettings {
    # User language setting
    language: UserLanguage!
    # Thrid party accounts binded for the user
    # oauthType: [OAuthType!]
    # Notification settings
    notification: NotificationSetting!
  }

  type UserActivity {
    history(input: ConnectionArgs!): ReadHistoryConnection!
    recentSearches(input: ConnectionArgs!): RecentSearchConnection!
  }

  type UserStatus {
    state: UserState!
    # Total MAT left in wallet
    MAT: MAT!
    invitation: InvitationStatus!
    # Number of articles published by user
    articleCount: Int! @deprecated(reason: "Use \`User.articles.totalCount\`.")
    # Number of views on articles
    viewCount: Int! @deprecated(reason: "Use \`User.drafts.totalCount\`.")
    draftCount: Int!
    # Number of comments posted by user
    commentCount: Int!
    quotationCount: Int! @deprecated(reason: "not used")
    subscriptionCount: Int! @deprecated(reason: "Use \`User.subscriptions.totalCount\`.")
    # Number of user that this user follows
    followeeCount: Int! @deprecated(reason: "Use \`User.followees.totalCount\`.")
    # Number of user that follows this user
    followerCount: Int! @deprecated(reason: "Use \`User.followers.totalCount\`.")
    # Number of unread notices
    unreadNoticeCount: Int!
  }

  type UserOSS {
    boost: NonNegativeFloat!
    score: NonNegativeFloat!
  }

  type MAT {
    total: Int!
    history(input: ConnectionArgs!): TransactionConnection!
  }

  type Transaction {
    delta: Int!
    purpose: TransactionPurpose!
    content: String!
    createdAt: DateTime!
  }

  type NotificationSetting {
    enable: Boolean!
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
    token: String
  }

  type UserConnection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [UserEdge!]
  }

  type UserEdge {
    cursor: String!
    node: User!
  }

  type InvitationConnection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [InvitationEdge!]
  }

  type InvitationEdge {
    cursor: String!
    node: Invitation!
  }

  type ReadHistoryConnection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ReadHistoryEdge!]
  }

  type ReadHistoryEdge {
    cursor: String!
    node: ReadHistory!
  }

  type RecentSearchConnection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [RecentSearchEdge!]
  }

  type RecentSearchEdge {
    cursor: String!
    node: String!
  }

  type TransactionConnection {
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

  input InviteInput {
    id: ID
    email: Email
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

  # input AddOAuthInput {
  #   name: String!
  #   id: String!
  #   type: OAuthType
  # }

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
  }

  input UpdateUserStateInput {
    id: ID!
    state: UserState!
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
    password_reset
    email_verify
  }

  enum UserInfoFields {
    displayName
    avatar
    description
    email
    mobile
  }

  enum UserLanguage {
    en
    zh_hans
    zh_hant
  }

  enum NotificationSettingType {
    enable
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

  # enum OAuthType {
  #   facebook
  #   wechat
  #   google
  # }

  enum UserState {
    active
    onboarding
    banned
    frozen
    archived
  }

  enum TransactionPurpose {
    appreciate
    invitationAccepted
    joinByInvitation
    joinByTask
  }
`
