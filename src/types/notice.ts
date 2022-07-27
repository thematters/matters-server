import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    "Mark all received notices as read."
    markAllNoticesAsRead: Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}")
  }

  extend type User {
    notices(input: ConnectionArgs!): NoticeConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @auth(mode: "${AUTH_MODE.oauth}") @cacheControl(maxAge: ${CACHE_TTL.INSTANT})
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
    # InCircleNewArticle
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
    CommentMentionedYou
    ArticleNewComment
    SubscribedArticleNewComment
    CircleNewBroadcast
    CircleNewDiscussion
    CircleMemberNewDiscussion
    CircleMemberNewDiscussionReply
    CircleMemberNewBroadcastReply
    InCircleNewBroadcast
    InCircleNewBroadcastReply
    InCircleNewDiscussion
    InCircleNewDiscussionReply
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
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: CircleNoticeType!

    target: Circle! @logCache(type: "${NODE_TYPES.Circle}")
  }

  enum CircleNoticeType {
    CircleNewSubscriber
    CircleNewFollower
    CircleNewUnsubscriber
    CircleInvitation
    CircleNewDiscussion
    CircleNewBroadcast
    CircleMemberBroadcast
    CircleMemberNewDiscussion
    CircleMemberNewDiscussionReply
    CircleMemberNewBroadcastReply

    InCircleNewArticle
    InCircleNewBroadcast
    InCircleNewBroadcastReply
    InCircleNewDiscussion
    InCircleNewDiscussionReply
  }

  type CircleCommentNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: CircleCommentNoticeType!

    target: Circle! @logCache(type: "${NODE_TYPES.Circle}")

    comment: Comment! @logCache(type: "${NODE_TYPES.Comment}")
  }

  enum CircleCommentNoticeType {
    CircleNewBroadcast
  }

  #################################
  #                               #
  #            Crypto             #
  #                               #
  #################################
  type CryptoNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "List of notice actors."
    actors: [User!] @logCache(type: "${NODE_TYPES.User}")

    type: CryptoNoticeType!

    target: CryptoWallet!
  }

  enum CryptoNoticeType {
    CryptoWalletAirdrop
    CryptoWalletConnected
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
