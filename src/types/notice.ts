import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    "Mark all received notices as read."
    markAllNoticesAsRead: Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}")
  }

  extend type User {
    notices(input: ConnectionArgs!): NoticeConnection! @complexity(multipliers: ["input.first"], value: 1) @auth(mode: "${AUTH_MODE.oauth}") @cacheControl(maxAge: ${CACHE_TTL.INSTANT})
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
    node: Notice! @logCache(type: "${NODE_TYPES.Notice}")
  }


  #################################
  #                               #
  #             User              #
  #                               #
  #################################
  type UserNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: UserNoticeType!

    target: User! @logCache(type: "${NODE_TYPES.User}")
  }

  enum UserNoticeType {
    UserNewFollower
  }


  #################################
  #                               #
  #           Article             #
  #                               #
  #################################
  type ArticleNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: ArticleNoticeType!

    target: Article! @logCache(type: "${NODE_TYPES.Article}")
  }

  enum ArticleNoticeType {
    ArticlePublished
    ArticleMentionedYou
    ArticleNewSubscriber
    ArticleNewAppreciation
    RevisedArticlePublished
    RevisedArticleNotPublished
    CircleNewArticle
  }

  type ArticleArticleNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: ArticleArticleNoticeType!

    target: Article! @logCache(type: "${NODE_TYPES.Article}")

    article: Article! @logCache(type: "${NODE_TYPES.Article}")
  }

  enum ArticleArticleNoticeType {
    ArticleNewCollected
  }


  #################################
  #                               #
  #           Comment             #
  #                               #
  #################################
  type CommentNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: CommentNoticeType!

    target: Comment! @logCache(type: "${NODE_TYPES.Comment}")
  }

  enum CommentNoticeType {
    CommentPinned
    CommentMentionedYou # article comment
    ArticleNewComment
    SubscribedArticleNewComment
    CircleNewBroadcast
  }

  type CommentCommentNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: CommentCommentNoticeType!

    target: Comment! @logCache(type: "${NODE_TYPES.Comment}")

    comment: Comment! @logCache(type: "${NODE_TYPES.Comment}")
  }

  enum CommentCommentNoticeType {
    CommentNewReply
  }

  #################################
  #                               #
  #             Tag               #
  #                               #
  #################################
  type ArticleTagNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: ArticleTagNoticeType!

    target: Article! @logCache(type: "${NODE_TYPES.Article}")

    tag: Tag! @logCache(type: "${NODE_TYPES.Tag}")
  }

  enum ArticleTagNoticeType {
    ArticleTagAdded
    ArticleTagRemoved
    ArticleTagUnselected @deprecated(reason: "No longer in use")
  }

  type TagNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: TagNoticeType!

    target: Tag! @logCache(type: "${NODE_TYPES.Tag}")
  }

  enum TagNoticeType {
    TagAdoption
    TagLeave
    TagAddEditor
    TagLeaveEditor
  }


  #################################
  #                               #
  #         Transaction           #
  #                               #
  #################################
  type TransactionNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: TransactionNoticeType!

    target: Transaction! @logCache(type: "${NODE_TYPES.Transaction}")
  }

  enum TransactionNoticeType {
    PaymentReceivedDonation
  }


  #################################
  #                               #
  #            Circle             #
  #                               #
  #################################
  type CircleNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: CircleNoticeType!

    target: Circle! @logCache(type: "${NODE_TYPES.Circle}")

    "Optional discussion/broadcast comments for bundled notices"
    comments: [Comment!] @logCache(type: "${NODE_TYPES.Comment}")

    "Optional discussion/broadcast replies for bundled notices"
    replies: [Comment!] @logCache(type: "${NODE_TYPES.Comment}")

    "Optional mention comments for bundled notices"
    mentions: [Comment!] @logCache(type: "${NODE_TYPES.Comment}")
  }

  enum CircleNoticeType {
    CircleInvitation
    CircleNewSubscriber
    CircleNewFollower
    CircleNewUnsubscriber
    CircleNewBroadcastComments
    CircleNewDiscussionComments
  }


  #################################
  #                               #
  #             Misc              #
  #                               #
  #################################
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
    link: String
  }

`
