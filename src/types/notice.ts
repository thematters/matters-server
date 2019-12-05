export default /* GraphQL */ `
  extend type Mutation {
    "Mark all received notices as read."
    markAllNoticesAsRead: Boolean
  }

  extend type User {
    notices(input: ConnectionArgs!): NoticeConnection! @scope
  }

  """
  This interface contains common fields of a notice.
  """
  interface Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!
  }

  type NoticeConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [NoticeEdge!]
  }

  type NoticeEdge {
    cursor: String!
    node: Notice!
  }

  """
  This notice type contains info about current user has new followers.
  """
  type UserNewFollowerNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of new followers."
    actors: [User]
  }

  """
  This notice type contains info about current user's article publihsed successfully.
  """
  type ArticlePublishedNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The article that has been published."
    target: Article
  }

  type ArticleNewDownstreamNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User]
    downstream: Article
    target: Article
  }

  """
  This notice type contains info about current user's article has been collected by others.
  """
  type ArticleNewCollectedNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user collect current user's articles."
    actor: User!

    "The article that collected current user's articles."
    collection: Article

    "The article that has been collected."
    target: Article
  }

  """
  This notice type contains info about current user's article has been appreciated by others.
  """
  type ArticleNewAppreciationNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of users who appreciated current user's article."
    actors: [User]

    "The article that has been appreciated."
    target: Article
  }

  """
  This notice type contains info about current user's article has been subscribed by others.
  """
  type ArticleNewSubscriberNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of users who subscribed current user's article."
    actors: [User]

    "The article that has been subscribed."
    target: Article
  }

  """
  This notice type contains info about current user's article has new comment.
  """
  type ArticleNewCommentNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who comment current user's article."
    actors: [User]

    "The article that has new comment."
    target: Article

    "The comment data."
    comment: Comment
  }

  """
  This notice type contains info about current user has been mentioned in an article.
  """
  type ArticleMentionedYouNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who mentioned current user."
    actor: User!

    "The article that current user has been mentioned in."
    target: Article
  }

  """
  This notice type contains info about current user's subscribed article has new comment.
  """
  type SubscribedArticleNewCommentNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who made new comment to current user's subscribed article."
    actors: [User]

    "The article that current user has been subscribed."
    target: Article

    "The comment data."
    comment: Comment
  }

  type UpstreamArticleArchivedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    upstream: Article
    target: Article
  }

  type DownstreamArticleArchivedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    downstream: Article
    target: Article
  }

  """
  This notice type contains info about current user's comment has been pinned.
  """
  type CommentPinnedNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who pinned current user's comment."
    actor: User!

    "The comment data."
    target: Comment
  }

  """
  This notice type contains info about current user's comment has new reply.
  """
  type CommentNewReplyNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who replied current user's comment."
    actors: [User]

    "The comment that has new replied."
    target: Comment

    "The comment that replied to current user's existing comment."
    reply: Comment
  }

  """
  The notice type contains info about current user's comment has new vote.
  """
  type CommentNewUpvoteNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who vote current user's comment."
    actors: [User]

    "The comment that has new vote."
    target: Comment
  }

  type CommentMentionedYouNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actor: User!
    target: Comment
  }

  """
  The notice type contains info about official announcement.
  """
  type OfficialAnnouncementNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The message content."
    message: String!

    "The link to a specific page if provided."
    link: URL
  }

  """
  This notice type contains info about one user has added a tag to current user's article.
  """
  type ArticleTagHasBeenAddedNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who replied current user's comment."
    actors: [User]

    "The article has a new tag."
    target: Article

    "The tag has been attached to an article."
    tag: Tag
  }

  """
  This notice type contains info about one uer has removed a tag from current user's article.
  """
  type ArticleTagHasBeenRemovedNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who replied current user's comment."
    actors: [User]

    "The article loses a tag."
    target: Article

    "The tag has been deattached from an article."
    tag: Tag
  }
`
