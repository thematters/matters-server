export default /* GraphQL */ `
  extend type Mutation {
    markAllNoticesAsRead: Boolean
  }

  extend type User {
    notices(input: ConnectionArgs!): NoticeConnection!
  }

  interface Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
  }

  type NoticeConnection {
    pageInfo: PageInfo!
    edges: [NoticeEdge!]
  }

  type NoticeEdge {
    cursor: String!
    node: Notice!
  }

  type UserNewFollowerNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
  }

  type ArticlePublishedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    target: Article!
  }

  type ArticleNewDownstreamNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    downstream: Article!
    target: Article!
  }

  type ArticleNewAppreciationNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Article!
    MAT: Int!
  }

  type ArticleNewSubscriberNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Article!
  }

  type ArticleNewCommentNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Article!
    comment: Comment!
  }

  type SubscribedArticleNewCommentNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Article!
    comment: Comment!
  }

  type UpstreamArticleArchivedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    upstream: Article!
    target: Article!
  }

  type DownstreamArticleArchivedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    downstream: Article!
    target: Article!
  }

  type CommentPinnedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actor: User!
    target: Comment!
  }

  type CommentNewReplyNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Comment!
    reply: Comment!
  }

  type CommentNewUpvoteNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User!]
    target: Comment!
  }

  type CommentMentionedYouNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actor: User!
    target: Comment!
  }

  type OfficialAnnouncementNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    message: String!
    link: URL
  }
`
