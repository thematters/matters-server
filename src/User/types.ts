export const types = /* GraphQL */ `
  extend type Query {
    user(id: String!): User
  }

  # extend type Mutation {
  # }

  type User {
    id: String!
    displayName: String!
    userName: String!
    # Self description of this user
    description: String!
    email: String!
    settings: UserSettings!
    status: UserStatus!
    # Articles written by this user
    articles: [Article]
    # Comments posted by this user
    comments: [Comment]
    # Followers of this user
    followers: [User]
    # Users that this user follows
    follows: [User]
  }

  type UserSettings {
    # User language setting
    language: UserLanguage!
    # Thrid party accounts binded for the user
    thirdPartyAccounts: [ThirdPartyAccount]
  }

  type UserStatus {
    # Total MAT left in wallet
    MAT: Int!
    # Average rating by other users, for mentors only
    rating: Float!
    # Number of articles published by user
    articleCount: Int!
    # Number of comments posted by user
    commentCount: Int!
    # Number of user that this user follows
    followCount: Int!
    # Number of user that follows this user
    followerCount: Int!
  }

  enum UserLanguage {
    en
    zh_hans
    zh_hant
  }
  enum ThirdPartyAccount {
    facebook
    wechat
    google
  }
`
