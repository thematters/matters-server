/* tslint:disable */
export default /* GraphQL */ `
  extend type Query {
    viewer: User
    user(input: UserInput!): User
  }

  extend type Mutation {
    sendVerificationEmail(input: SendVerificationEmailInput): Boolean
    sendPasswordResetEmail(input: SendVerificationEmailInput): Boolean
    resetPassword(input: ResetPasswordInput): Boolean
    userRegister(input: UserRegisterInput): User
    userLogin(input: UserLoginInput): LoginResult!
    addOAuth(input: AddOAuthInput): Boolean
    updateUserInfo(input: UpdateUserInfoInput): User!
    followUser(input: FollowUserInput): Boolean
    unfollowUser(input: UnfollowUserInput): Boolean
    importArticles(input: ImportArticlesInput): [Article]
    updateNotificationSetting(input: UpdateNotificationSettingInput): NotificationSetting
    clearReadHistory(input: ClearReadHistoryInput): Boolean
    clearSearchHistory: Boolean
  }

  type User {
    uuid: UUID!
    # Get article for this user
    article(input: ArticleInput!): Article!
    # Get other user info for this user
    user(input: UserInput!): User!
    info: UserInfo!
    settings: UserSettings!
    # Personalized recommendations
    recommnedation: Recommendation!
    # Articles written by this user
    articles(input: ListInput): [Article]
    drafts(input: ListInput): [Draft]
    audioDrafts(input: ListInput): [AudioDraft]
    # Comments posted by this user
    commentedArticles(input: ListInput): [Article]
    # comments that citated this user's article
    citedArticles(input: ListInput): [Article]
    subscriptions(input: ListInput): [Article]
    activity: UserActivity!
    # Followers of this user
    followers(input: ListInput): [User]
    # Users that this user follows
    followees(input: ListInput): [User]
    # Current user has followed this user
    isFollowee: Boolean!
    # This user has followed current user
    isFollower: Boolean!
    status: UserStatus!
  }

  type UserInfo {
    createdAt: DateTime!
    # Unique user name
    userName: String!
    # Display name on profile
    displayName: String!
    # User desciption
    description: String!
    # URL for avatar
    avatar: URL!
    email: Email!
    mobile: String!
    # Use 500 for now, adaptive in the future
    readSpeed: Int!
  }

  type UserSettings {
    # User language setting
    language: UserLanguage!
    # Thrid party accounts binded for the user
    oauthType: [OAuthType]
    # Notification settings
    notification: NotificationSetting!
  }

  type Recommendation {
    hottest(input: ListInput): [Article]!
    # In case you missed it
    icymi(input: ListInput): [Article]!
    authors(input: ListInput): [User]!
    tags(input: ListInput): [Tag]!
    topics(input: ListInput): [Article]!
  }

  type UserActivity {
    history(input: ListInput): [Article]
    recentSearches(input: ListInput): [String]
    invited(input: ListInput): [User]
  }

  type UserStatus {
    currGravity: Int!
    # Total MAT left in wallet
    MAT: Int!
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
    walletUpdate: Boolean!
    officialNotice: Boolean!
    reportFeedback: Boolean!
  }

  type LoginResult {
    auth: Boolean!
    token: String
  }

  input SendVerificationEmailInput {
    email: Email!
  }

  input SendPasswordResetEmailInput {
    email: Email!
  }

  input UserRegisterInput {
    email: Email!
    displayName: String!
    password: String!
    code: String
  }

  input UserLoginInput {
    email: Email!
    password: String!
  }

  input FollowUserInput {
    uuid: UUID
  }

  input UnfollowUserInput {
    uuid: UUID
  }

  input ImportArticlesInput {
    platform: String
    token: String
  }

  input ClearReadHistoryInput {
    uuid: UUID
  }

  input UpdateNotificationSettingInput {
    type: String!
    enabled: Boolean!
  }

  input UpdateUserInfoInput {
    displayName: String
    avatar: URL
    description: String
    language: UserLanguage
  }

  input AddOAuthInput {
    name: String!
    id: String!
    type: OAuthType
  }

  input ResetPasswordInput {
    password: String!
  }

  input UserInput {
    uuid: UUID
  }

  input ArticleInput {
    uuid: UUID
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

  enum OAuthType {
    facebook
    wechat
    google
  }
`
