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
    actors: [User] @logCache(type: "${NODE_TYPES.user}")
  }

  #################################
  #                               #
  #           Article             #
  #                               #
  #################################
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
    target: Article @logCache(type: "${NODE_TYPES.article}")
  }

  type ArticleNewDownstreamNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actors: [User] @logCache(type: "${NODE_TYPES.user}")
    downstream: Article
    target: Article @logCache(type: "${NODE_TYPES.article}")
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
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    "The article that collected current user's articles."
    collection: Article @logCache(type: "${NODE_TYPES.article}")

    "The article that has been collected."
    target: Article @logCache(type: "${NODE_TYPES.article}")
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
    actors: [User] @logCache(type: "${NODE_TYPES.user}")

    "The article that has been appreciated."
    target: Article @logCache(type: "${NODE_TYPES.article}")
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
    actors: [User] @logCache(type: "${NODE_TYPES.user}")

    "The article that has been subscribed."
    target: Article @logCache(type: "${NODE_TYPES.article}")
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
    actors: [User] @logCache(type: "${NODE_TYPES.user}")

    "The article that has new comment."
    target: Article @logCache(type: "${NODE_TYPES.article}")

    "The comment data."
    comment: Comment @logCache(type: "${NODE_TYPES.comment}")
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
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    "The article that current user has been mentioned in."
    target: Article @logCache(type: "${NODE_TYPES.article}")
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
    actors: [User] @logCache(type: "${NODE_TYPES.user}")

    "The article that current user has been subscribed."
    target: Article @logCache(type: "${NODE_TYPES.article}")

    "The comment data."
    comment: Comment @logCache(type: "${NODE_TYPES.comment}")
  }

  type UpstreamArticleArchivedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    upstream: Article @logCache(type: "${NODE_TYPES.article}")
    target: Article @logCache(type: "${NODE_TYPES.article}")
  }

  type DownstreamArticleArchivedNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    downstream: Article @logCache(type: "${NODE_TYPES.article}")
    target: Article @logCache(type: "${NODE_TYPES.article}")
  }

  """
  This type has info about user's revised article publihsed successfully.
  """
  type RevisedArticlePublishedNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The article that has been published."
    target: Article @logCache(type: "${NODE_TYPES.article}")
  }

  """
  This type has info about user's revised article publihsed unsuccessfully.
  """
  type RevisedArticleNotPublishedNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The article that has been published."
    target: Article @logCache(type: "${NODE_TYPES.article}")
  }

  #################################
  #                               #
  #           Comment             #
  #                               #
  #################################
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
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    "The comment data."
    target: Comment @logCache(type: "${NODE_TYPES.comment}")
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
    actors: [User] @logCache(type: "${NODE_TYPES.user}")

    "The comment that has new replied."
    target: Comment @logCache(type: "${NODE_TYPES.comment}")

    "The comment that replied to current user's existing comment."
    reply: Comment @logCache(type: "${NODE_TYPES.comment}")
  }

  type CommentMentionedYouNotice implements Notice {
    id: ID!
    unread: Boolean!
    createdAt: DateTime!
    actor: User! @logCache(type: "${NODE_TYPES.user}")
    target: Comment @logCache(type: "${NODE_TYPES.comment}")
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

  #################################
  #                               #
  #             Tag               #
  #                               #
  #################################
  """
  This notice type contains info about one user has added current user's article, and set it as selected.
  """
  type ArticleTagHasBeenAddedNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who replied current user's comment."
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    "The article has a new tag."
    target: Article @logCache(type: "${NODE_TYPES.article}")

    "The tag has been attached to an article."
    tag: Tag @logCache(type: "${NODE_TYPES.tag}")
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
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    "The article loses a tag."
    target: Article @logCache(type: "${NODE_TYPES.article}")

    "The tag has been deattached from an article."
    tag: Tag @logCache(type: "${NODE_TYPES.tag}")
  }

  """
  This notice type contains info about one user has set current user's article unselected.
  """
  type ArticleTagHasBeenUnselectedNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who replied current user's comment."
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    "The article has a new tag."
    target: Article @logCache(type: "${NODE_TYPES.article}")

    "The tag has been attached to an article."
    tag: Tag @logCache(type: "${NODE_TYPES.tag}")
  }

  """
  This notice type contains info about a tag has been adopted by a user.
  """
  type TagAdoptionNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who adopted a tag."
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    "The tag adopted by user."
    tag: Tag @logCache(type: "${NODE_TYPES.tag}")
  }

  """
  This notice type contains info about a user left a tag.
  """
  type TagLeaveNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who leave a tag."
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    "The tag left by user."
    tag: Tag @logCache(type: "${NODE_TYPES.tag}")
  }

  """
  This notice type contains info about editors has been added into a tag.
  """
  type TagAddEditorNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who added editor to a tag."
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    tag: Tag @logCache(type: "${NODE_TYPES.tag}")
  }

  """
  This notice type contains info about a editor left a tag.
  """
  type TagLeaveEditorNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who leave from tag editors."
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    tag: Tag @logCache(type: "${NODE_TYPES.tag}")
  }

  #################################
  #                               #
  #            Payment            #
  #                               #
  #################################
  """
  This notice type contains info about current user received a donation.
  """
  type PaymentReceivedDonationNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The user who donated to current user."
    actor: User! @logCache(type: "${NODE_TYPES.user}")

    "The transaction data."
    target: Transaction @logCache(type: "${NODE_TYPES.transaction}")
  }

  """
  This notice type contains info about current user requested to payout.
  """
  type PaymentPayoutNotice implements Notice {
    "Unique ID of this notice."
    id: ID!

    "The value determines if the notice is unread or not."
    unread: Boolean!

    "Time of this notice was created."
    createdAt: DateTime!

    "The transaction data."
    target: Transaction @logCache(type: "${NODE_TYPES.transaction}")
  }
`
