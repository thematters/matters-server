/* tslint:disable */
export default /* GraphQL */ `
  extend type Query {
    viewer: User
    user(uuid: UUID!): User
  }

  extend type Mutation {
    sendVerificationEmail(input: SendVerificationEmailInput): Boolean
    userRegister(input: UserRegisterInput): User
    userLogin(input: UserLoginInput): LoginResult!
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
    article(uuid: UUID!): Article!
    # Get other user info for this user
    user(uuid: UUID!): User!
    info: UserInfo!
    settings: UserSettings!
    # Personalized recommendations
    recommnedation: Recommendation!
    # Current user has followed this user
    hasFollowed: Boolean!
    # Articles written by this user
    articles(offset: Int, limit: Int): [Article]
    drafts(offset: Int, limit: Int): [Draft]
    audioDrafts(offset: Int, limit: Int): [AudioDraft]
    # Comments posted by this user
    comments(offset: Int, limit: Int): [Comment]
    # comments that citated this user's article
    citations(offset: Int, limit: Int): [Comment]
    subscriptions(offset: Int, limit: Int): [Article]
    activity: UserActivity!
    # Followers of this user
    followers(offset: Int, limit: Int): [User]
    # Users that this user follows
    followees(offset: Int, limit: Int): [User]
    status: UserStatus!
  }

  type UserInfo {
    # Unique user name
    userName: String!
    # Display name on profile
    displayName: String!
    # User desciption
    description: String!
    # URL for avatar
    avatar: String!
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
    hottest(first: Int, after: Int): [Article]!
    # In case you missed it
    icymi(first: Int, after: Int): [Article]!
    authors (first: Int, after: Int): [User]!
  }

  type UserActivity {
    history(first: Int, after: Int): [Article]
    recentSearches(first: Int, after: Int): [String]
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
    citationCount: Int!
    subscriptionCount: Int!
    # Number of user that this user follows
    followeeCount: Int!
    # Number of user that follows this user
    followerCount: Int!
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

  input UserRegisterInput {
    email: Email!
    userName: String!
    displayName: String!
    description: String!
    avatar: String!
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
    type: String
    enabled: Boolean
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
