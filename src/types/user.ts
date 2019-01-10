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
    confirmResetPassword(input: ConfirmResetPasswordInput!): Boolean
    # change email
    confirmChangeEmail(input: ConfirmChangeEmailInput!): Boolean
    # verify email
    confirmVerifyEmail(input: ConfirmVerifyEmailInput!): Boolean
    # register
    userRegister(input: UserRegisterInput!): AuthResult!
    # login
    userLogin(input: UserLoginInput!): AuthResult!
    # addOAuth(input: AddOAuthInput!): Boolean
    # update info/ setting
    updateUserInfo(input: UpdateUserInfoInput!): User!
    updateNotificationSetting(input: UpdateNotificationSettingInput!): NotificationSetting
    # follow/unfollow
    followUser(input: FollowUserInput!): Boolean
    unfollowUser(input: UnfollowUserInput!): Boolean
    # misc
    # importArticles(input: ImportArticlesInput!): [Article!]
    clearReadHistory(input: ClearReadHistoryInput): Boolean
    clearSearchHistory: Boolean
    invite(input: InviteInput!): Boolean
  }

  type User implements Node {
    id: ID!
    uuid: UUID!
    info: UserInfo!
    settings: UserSettings!
    recommendation: Recommendation!
    # Articles written by this user
    articles(input: ListInput!): [Article!]
    drafts(input: ListInput!): [Draft!]
    audioDrafts(input: ListInput!): [AudioDraft!]
    # Comments posted by this user
    commentedArticles(input: ListInput!): [Article!]
    # comments that quoted this user's article
    quotedArticles(input: ListInput!): [Article!]
    subscriptions(input: ListInput!): [Article!]
    activity: UserActivity!
    # Followers of this user
    followers(input: ListInput!): [User!]
    # Users that this user follows
    followees(input: ListInput!): [User!]
    # This user is following viewer
    isFollower: Boolean!
    # Viewer is following this user
    isFollowee: Boolean!
    status: UserStatus!
  }


  type InvitationStatus {
    MAT: Int!
    # invitation number left
    left: Int!
    # invitations sent
    sent(input: ListInput!): [Invitation!]
  }

  type Invitation implements Node  {
    id: ID!
    user: User
    email: String
    accepted: Boolean!
    createdAt: DateTime!
  }

  type Recommendation {
    followeeArticles(input: ListInput!): [Article!]
    newest(input: ListInput!): [Article!]
    hottest(input: ListInput!): [Article!]
    # In case you missed it
    icymi(input: ListInput!): [Article!]
    tags(input: ListInput!): [Tag!]
    topics(input: ListInput!): [Article!]
    authors(input: ListInput!): [User!]
  }

  type UserInfo {
    createdAt: DateTime!
    # Unique user name
    userName: String!
    # Display name on profile
    displayName: String!
    # User desciption
    description: String
    # URL for avatar
    avatar: URL
    email: Email
    mobile: String
    # Use 500 for now, adaptive in the future
    readSpeed: Int!
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
    history(input: ListInput!): [ReadHistory!]
    recentSearches(input: ListInput!): [String!]
  }

  type UserStatus {
    state: UserState!
    # Total MAT left in wallet
    MAT: MAT!
    invitation: InvitationStatus!
    # Number of articles published by user
    articleCount: Int!
    # Number of views on articles
    viewCount: Int!
    draftCount: Int!
    # Number of comments posted by user
    commentCount: Int!
    quotationCount: Int!
    subscriptionCount: Int!
    # Number of user that this user follows
    followeeCount: Int!
    # Number of user that follows this user
    followerCount: Int!
    # Number of unread notices
    unreadNoticeCount: Int!
  }

  type MAT {
    total: Int!
    history(input: ListInput!): [Transaction!]
  }

  type Transaction {
    delta: Int!
    purpose: TransactionPurpose!
    reference: Node
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
    id: ID!
    article: Article!
    readAt: DateTime!
  }

  type AuthResult {
    auth: Boolean!
    token: String
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
    code: String!
  }

  input ConfirmResetPasswordInput {
    password: String!
    codeId: ID!
  }

  input ConfirmChangeEmailInput {
    oldEmail: Email!
    oldEmailCodeId: ID!
    newEmail: Email!
    newEmailCodeId: ID!
  }

  input ConfirmVerifyEmailInput {
    email: Email!
    codeId: ID!
  }

  input UserRegisterInput {
    email: Email!
    displayName: String!
    password: String!
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
    avatar: ID
    description: String
    language: UserLanguage
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
    inactive
    onboarding
    active
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
