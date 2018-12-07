/* tslint:disable */
export default /* GraphQL */ `
  extend type Query {
    viewer: User
    user(uuid: UUID!): User
  }

  extend type Mutation {
    sendVerificationEmail(input: SendVerificationEmailInput): Boolean
    sendPasswordResetEmail(input: SendVerificationEmailInput): Boolean
    userRegister(input: UserRegisterInput): User
    userLogin(input: UserLoginInput): LoginResult!
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
    articles(input: ListInput): [Article]
    drafts(input: ListInput): [Draft]
    audioDrafts(input: ListInput): [AudioDraft]
    # Comments posted by this user
    comments(input: ListInput): [Comment]
    # comments that citated this user's article
    quotations(input: ListInput): [Comment]
    subscriptions(input: ListInput): [Article]
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
    type: String
    enabled: Boolean
  }


  input UpdateUserInfoInput {
    field: UserInfoFields
    value: String!
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
