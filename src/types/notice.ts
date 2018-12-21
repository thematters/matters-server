export default /* GraphQL */ `
  extend type Mutation {
    markAllNoticesAsRead: Boolean
  }

  extend type User {
    notices(input: ListInput!): [Notice!]
  }

  interface Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
  }

  type UserNewFollowerNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
  }

  type UserDisabledNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    reason: UserDisabledReason
  }
  enum UserDisabledReason {
    violation
  }

  type ArticlePublishedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    target: Article
  }

  type ArticleReportedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    target: Article
    reason: ArticleReportedReason
  }
  enum ArticleReportedReason {
    violation
  }

  type ArticleArchivedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    target: Article
    reason: ArticleArchivedReason
  }
  enum ArticleArchivedReason {
    violation
  }

  type ArticleNewDownstreamNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    downstream: Article
    target: Article
  }

  type ArticleNewAppreciationNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User]
    target: Article
    MAT: Int
  }

  type ArticleNewSubscriberNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Article
  }

  type ArticleNewCommentNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Article
  }

  type SubscribedArticleNewCommentNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Article
  }

  type CommentPinnedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    target: Comment
  }

  type CommentReportedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    target: Comment
    reason: CommentReportedReason
  }
  enum CommentReportedReason {
    violation
  }

  type CommentArchivedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    target: Comment
    reason: CommentArchivedReason
  }
  enum CommentArchivedReason {
    violation
  }

  type CommentNewReplyNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User]
    target: Comment
  }

  type CommentNewUpvoteNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Comment
  }

  type CommentMentionedYouNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Comment
  }

  type OfficialAnnouncementNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    message: String!
    link: URL
  }
`
