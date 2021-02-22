import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    "Mark all received notices as read."
    markAllNoticesAsRead: Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}")
  }

  extend type User {
    notices(input: ConnectionArgs!): NoticeConnection! @auth(mode: "${AUTH_MODE.oauth}") @cacheControl(maxAge: ${CACHE_TTL.INSTANT})
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
    node: Notice! @logCache(type: "${NODE_TYPES.notice}")
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
    actors: [User!] @logCache(type: "${NODE_TYPES.user}")

    type: UserNoticeType!

    target: User! @logCache(type: "${NODE_TYPES.user}")
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
    actors: [User!] @logCache(type: "${NODE_TYPES.user}")

    type: ArticleNoticeType!

    target: Article! @logCache(type: "${NODE_TYPES.article}")
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
    actors: [User!] @logCache(type: "${NODE_TYPES.user}")

    type: ArticleArticleNoticeType!

    target: Article! @logCache(type: "${NODE_TYPES.article}")

    article: Article! @logCache(type: "${NODE_TYPES.article}")
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
    actors: [User!] @logCache(type: "${NODE_TYPES.user}")

    type: CommentNoticeType!

    target: Comment! @logCache(type: "${NODE_TYPES.comment}")
  }

  enum CommentNoticeType {
    ArticleCommentPinned
    ArticleCommentMentionedYou
    ArticleNewComment
    SubscribedArticleNewComment
    CircleNewDiscussion
    CircleNewBoardcast
  }

  type CommentCommentNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.user}")

    type: CommentCommentNoticeType!

    target: Comment! @logCache(type: "${NODE_TYPES.comment}")

    comment: Comment! @logCache(type: "${NODE_TYPES.comment}")
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
    actors: [User!] @logCache(type: "${NODE_TYPES.user}")

    type: ArticleTagNoticeType!

    target: Article! @logCache(type: "${NODE_TYPES.article}")

    tag: Tag! @logCache(type: "${NODE_TYPES.tag}")
  }

  enum ArticleTagNoticeType {
    ArticleTagAdded
    ArticleTagRemoved
    ArticleTagUnselected
  }

  type TagNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.user}")

    type: TagNoticeType!

    target: Tag! @logCache(type: "${NODE_TYPES.tag}")
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
    actors: [User!] @logCache(type: "${NODE_TYPES.user}")

    type: TransactionNoticeType!

    target: Transaction! @logCache(type: "${NODE_TYPES.transaction}")
  }

  enum TransactionNoticeType {
    PaymentReceivedDonation
    PaymentPayout
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
    actors: [User!] @logCache(type: "${NODE_TYPES.user}")

    type: CircleNoticeType!

    target: Circle! @logCache(type: "${NODE_TYPES.circle}")
  }

  enum CircleNoticeType {
    CircleNewFollower
    CircleNewSubscriber
    CircleNewUnsubscriber
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
    link: URL
  }

`
